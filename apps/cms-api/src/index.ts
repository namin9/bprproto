import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { cache } from 'hono/cache'
import { HTTPException } from 'hono/http-exception'
import { tenantIdentification, authMiddleware, Env as MiddlewareEnv } from './middleware' // Env 임포트
import auth from './auth'
import tenants from './tenants'
import admins from './admins'
import articles from './articles'
import categories from './categories'
import media from './media'
import tenantSettings from './tenant-settings'
import { getDb } from './db' // getDb 임포트
import { articles as articlesTable, categories as categoriesTable, admins as adminsTable, tenants as tenantsTable } from '@bprproto/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import adminUi from './admin'

// MiddlewareEnv 타입에서 Bindings를 가져옵니다.
export type AppEnv = {
    Bindings: MiddlewareEnv['Bindings'] & {
        R2_BUCKET: R2Bucket; // R2 바인딩 추가
    };
    Variables: MiddlewareEnv['Variables'] & {
        db: ReturnType<typeof getDb>; // db 인스턴스를 변수로 추가
    };
}

const app = new Hono<AppEnv>()

// Cloudflare Pages 프론트엔드와의 통신을 위한 CORS 설정
app.use('*', cors())

// 글로벌 에러 핸들러: 모든 예외를 캡처하여 로깅 및 응답 처리
app.onError((err, c) => {
    console.error(`[Global Error]: ${err.message}`, err.stack);
    
    if (err instanceof HTTPException) {
        return err.getResponse();
    }
    
    return c.json({ message: 'Internal Server Error', error: err.message }, 500);
});

// Drizzle DB 인스턴스를 생성하고 context에 주입하는 미들웨어
app.use('*', async (c, next) => {
    const db = getDb(c.env.DB);
    c.set('db', db);
    await next();
});

// Favicon handler to prevent 404 noise in logs
app.get('/favicon.ico', (c) => c.text('', 204))

// System Bootstrap Route (Bypasses tenant identification for first-time setup)
app.get('/bootstrap', async (c) => {
    const tenantId = 'test-tenant-id';
    try {
        // 1. Create initial tenant in D1
        await c.var.db.insert(tenantsTable).values({
            id: tenantId,
            name: 'BPR CMS Site',
            slug: 'test-site',
            customDomain: 'bprproto.pages.dev',
        }).onConflictDoNothing();

        // 2. Create KV mappings for both domains
        await c.env.KV.put(`domain:bprproto.pages.dev`, tenantId);
        await c.env.KV.put(`domain:pbr1.koolee1372.workers.dev`, tenantId);

        return c.json({ 
            message: 'Bootstrap successful. KV mappings created.', 
            mappedDomains: ['bprproto.pages.dev', 'pbr1.koolee1372.workers.dev'],
            tenantId 
        });
    } catch (e: any) {
        return c.json({ message: 'Bootstrap failed', error: e.message }, 500);
    }
});


// Tenant identification for all routes
app.use('*', tenantIdentification)

// Auth routes
app.route('/auth', auth)

// Protected API routes
const api = new Hono<AppEnv>() // api 앱에도 Env 타입 적용
api.use('/*', authMiddleware)
api.get('/me', (c) => {
    const payload = c.get('jwtPayload')
    return c.json({ user: payload })
})

// 대시보드 통계 API
api.get('/stats', async (c) => {
    const tenantId = c.get('tenantId');
    const db = c.var.db;

    // 병렬 쿼리로 통계 데이터 조회
    const [articleCount, categoryCount, adminCount] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(articlesTable).where(eq(articlesTable.tenantId, tenantId)),
        db.select({ count: sql<number>`count(*)` }).from(categoriesTable).where(eq(categoriesTable.tenantId, tenantId)),
        db.select({ count: sql<number>`count(*)` }).from(adminsTable).where(eq(adminsTable.tenantId, tenantId)),
    ]);

    return c.json({
        articles: articleCount[0].count,
        categories: categoryCount[0].count,
        admins: adminCount[0].count,
    });
});

// Public API for Renderer
const publicApi = new Hono<AppEnv>()

publicApi.get('/articles', cache({
    cacheName: 'bpr-articles-list',
    cacheControl: 'max-age=600, s-maxage=600', // 10분간 캐싱
}), async (c) => {
    const tenantId = c.get('tenantId');
    const result = await c.var.db.query.articles.findMany({
        where: and(eq(articlesTable.tenantId, tenantId), eq(articlesTable.isPublic, 1)),
        orderBy: [desc(articlesTable.publishedAt)],
    });
    return c.json(result);
});

publicApi.get('/articles/:slug', cache({
    cacheName: 'bpr-article-detail',
    cacheControl: 'max-age=3600, s-maxage=3600', // 1시간 동안 캐싱
}), async (c) => {
    const tenantId = c.get('tenantId');
    const slug = c.req.param('slug');
    const result = await c.var.db.query.articles.findFirst({
        where: and(eq(articlesTable.tenantId, tenantId), eq(articlesTable.slug, slug), eq(articlesTable.isPublic, 1))
    });
    if (!result) return c.json({ message: 'Not found' }, 404);
    return c.json(result);
});

app.route('/public', publicApi)

// Mount the APIs
api.route('/tenants', tenants)
api.route('/admins', admins)
api.route('/articles', articles)
api.route('/categories', categories)
api.route('/media', media)
api.route('/settings', tenantSettings)

app.route('/api', api)

// Admin UI routes
app.route('/admin', adminUi)

app.get('/', (c) => {
    const tenantId = c.get('tenantId')
    return c.text(`Hello from tenant ${tenantId}!`)
})

export default app
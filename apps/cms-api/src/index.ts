import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { cache } from 'hono/cache'
import { tenantIdentification, authMiddleware, Env as MiddlewareEnv } from './middleware' // Env 임포트
import auth from './auth'
import tenants from './tenants'
import admins from './admins'
import articles from './articles'
import categories from './categories'
import media from './media'
import tenantSettings from './tenant-settings'
import { getDb } from './db' // getDb 임포트
import { articles as articlesTable } from '@bprproto/db/schema'
import { eq, and, desc } from 'drizzle-orm'
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

// Drizzle DB 인스턴스를 생성하고 context에 주입하는 미들웨어
app.use('*', async (c, next) => {
    const db = getDb(c.env.DB);
    c.set('db', db);
    await next();
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
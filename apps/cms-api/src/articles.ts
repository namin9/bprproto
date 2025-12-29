import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { articles, articleCategories, categories } from '@bprproto/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { AppEnv } from './index'; // index.ts에서 정의한 AppEnv 임포트
import { z } from 'zod'; // 임시 유효성 검사를 위해 Zod 임포트

const app = new Hono<AppEnv>()

// 임시 아티클 스키마 (나중에 shared/types로 이동)
const articleInputSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
    content: z.string().optional(),
    thumbnailUrl: z.string().url().optional(),
    seoMeta: z.record(z.any()).optional(),
    postType: z.enum(['BLOG', 'PRESS', 'EVENT', 'NOTICE']).default('BLOG'),
    isPublic: z.boolean().default(false),
    publishedAt: z.number().optional(), // Unix timestamp
    categoryIds: z.array(z.number()).optional(), // 다대다 관계를 위한 ID 배열
});


// 모든 아티클 조회
app.get('/', async (c) => {
    const tenantId = c.get('tenantId');
    const allArticles = await c.var.db.query.articles.findMany({
        where: eq(articles.tenantId, tenantId),
        with: {
            // 관계 설정이 되어 있다고 가정 (Drizzle Relational Queries)
        }
    });
    return c.json(allArticles);
})

// 단일 아티클 조회
app.get('/:id', async (c) => {
    const id = Number(c.req.param('id')); // id는 integer
    const tenantId = c.get('tenantId');
    const article = await c.var.db.query.articles.findFirst({
        where: and(eq(articles.id, id), eq(articles.tenantId, tenantId)),
    });

    if (!article) {
        throw new HTTPException(404, { message: 'Article not found' });
    }
    return c.json(article);
})

// 아티클 생성
app.post('/', async (c) => {
    const body = await c.req.json();
    const parsed = articleInputSchema.safeParse(body);
    if (!parsed.success) {
        throw new HTTPException(400, { message: parsed.error.issues.map(issue => issue.message).join(', ') });
    }

    const { categoryIds, ...articleData } = parsed.data;
    const tenantId = c.get('tenantId');
    const authorId = c.get('jwtPayload').sub;
    const now = Math.floor(Date.now() / 1000);

    // 발행 워크플로우: 공개 설정 시 발행일이 없으면 현재 시간으로 설정
    if (articleData.isPublic && !articleData.publishedAt) {
        articleData.publishedAt = now;
    }

    // 트랜잭션 처리 (D1은 현재 단일 쿼리 위주이나 Drizzle 트랜잭션 API 사용 권장)
    const result = await c.var.db.batch([
        c.var.db.insert(articles).values({
            ...articleData,
            tenantId,
            authorId,
            createdAt: now,
            updatedAt: now,
        }).returning(),
    ]);

    const newArticle = result[0][0] as any;

    // 카테고리 연결 데이터 삽입
    if (categoryIds && categoryIds.length > 0) {
        // 테넌트 소유권 확인
        const validCategories = await c.var.db.query.categories.findMany({
            where: and(
                eq(categories.tenantId, tenantId),
                inArray(categories.id, categoryIds)
            )
        });
        if (validCategories.length !== categoryIds.length) {
            throw new HTTPException(400, { message: 'Invalid category IDs for this tenant' });
        }

        const values = categoryIds.map(catId => ({ articleId: newArticle.id, categoryId: catId }));
        await c.var.db.insert(articleCategories).values(values);
    }

    return c.json(newArticle, 201);
})

// 아티클 업데이트
app.put('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const body = await c.req.json();
    const parsed = articleInputSchema.partial().safeParse(body);
    if (!parsed.success) {
        throw new HTTPException(400, { message: parsed.error.issues.map(issue => issue.message).join(', ') });
    }

    const { categoryIds, ...articleData } = parsed.data;
    const now = Math.floor(Date.now() / 1000);

    // 발행 워크플로우: 공개로 전환될 때 발행일이 없으면 현재 시간으로 설정
    if (articleData.isPublic && !articleData.publishedAt) {
        articleData.publishedAt = now;
    }

    const result = await c.var.db.update(articles)
        .set({ ...articleData, updatedAt: now })
        .where(and(eq(articles.id, id), eq(articles.tenantId, c.get('tenantId'))))
        .returning();

    if (!result.length) {
        throw new HTTPException(404, { message: 'Article not found' });
    }

    // 카테고리 관계 동기화 (기존 연결 삭제 후 재삽입)
    if (categoryIds !== undefined) {
        const tenantId = c.get('tenantId');
        // 테넌트 소유권 확인
        const validCategories = await c.var.db.query.categories.findMany({
            where: and(
                eq(categories.tenantId, tenantId),
                inArray(categories.id, categoryIds)
            )
        });
        if (validCategories.length !== categoryIds.length) {
            throw new HTTPException(400, { message: 'Invalid category IDs for this tenant' });
        }

        await c.var.db.delete(articleCategories).where(eq(articleCategories.articleId, id));
        if (categoryIds.length > 0) {
            const values = categoryIds.map(catId => ({ articleId: id, categoryId: catId }));
            await c.var.db.insert(articleCategories).values(values);
        }
    }

    return c.json(result[0]);
})

// 아티클 삭제
app.delete('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const tenantId = c.get('tenantId');

    const deletedArticle = await c.var.db.delete(articles)
        .where(and(eq(articles.id, id), eq(articles.tenantId, tenantId)))
        .returning();

    if (!deletedArticle.length) {
        throw new HTTPException(404, { message: 'Article not found' });
    }

    // 연결된 카테고리 정보도 함께 삭제
    await c.var.db.delete(articleCategories).where(eq(articleCategories.articleId, id));

    return c.json({ message: 'Article deleted', id: deletedArticle[0].id });
})

export default app
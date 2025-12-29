import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { articles } from '@bprproto/db/schema' // 공유 스키마에서 articles 테이블 임포트
import { eq } from 'drizzle-orm' // Drizzle ORM의 equal 조건자 임포트
import { AppEnv } from './index'; // index.ts에서 정의한 AppEnv 임포트
import { z } from 'zod'; // 임시 유효성 검사를 위해 Zod 임포트

const app = new Hono<AppEnv>()

// 임시 아티클 스키마 (나중에 shared/types로 이동)
const articleInputSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    content: z.string().optional(),
    thumbnailUrl: z.string().url().optional(),
    seoMeta: z.record(z.any()).optional(),
    postType: z.enum(['BLOG', 'PRESS', 'EVENT', 'NOTICE']).default('BLOG'),
    isPublic: z.boolean().default(false),
    publishedAt: z.number().optional(), // Unix timestamp
});


// 모든 아티클 조회
app.get('/', async (c) => {
    const allArticles = await c.var.db.query.articles.findMany();
    return c.json(allArticles);
})

// 단일 아티클 조회
app.get('/:id', async (c) => {
    const id = Number(c.req.param('id')); // id는 integer
    const article = await c.var.db.query.articles.findFirst({
        where: eq(articles.id, id),
    });

    if (!article) {
        throw new HTTPException(404, { message: 'Article not found' });
    }
    return c.json(article);
})

// 아티클 생성
app.post('/', async (c) => {
    const body = await c.req.json();
    const parsed = articleInputSchema.omit({ isPublic: true }).safeParse(body);
    if (!parsed.success) {
        throw new HTTPException(400, { message: parsed.error.issues.map(issue => issue.message).join(', ') });
    }

    const newArticle = await c.var.db.insert(articles).values({
        ...parsed.data,
        tenantId: c.get('tenantId'), // tenantId는 미들웨어에서 가져옴
        authorId: c.get('jwtPayload').sub, // JWT payload에서 authorId 가져옴
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
    }).returning();

    return c.json(newArticle[0], 201);
})

// 아티클 업데이트
app.put('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const body = await c.req.json();
    const parsed = articleInputSchema.partial().safeParse(body);
    if (!parsed.success) {
        throw new HTTPException(400, { message: parsed.error.issues.map(issue => issue.message).join(', ') });
    }

    const updatedArticle = await c.var.db.update(articles)
        .set({
            ...parsed.data,
            updatedAt: Math.floor(Date.now() / 1000),
        })
        .where(eq(articles.id, id))
        .returning();

    if (!updatedArticle.length) {
        throw new HTTPException(404, { message: 'Article not found' });
    }

    return c.json(updatedArticle[0]);
})

// 아티클 삭제
app.delete('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const deletedArticle = await c.var.db.delete(articles).where(eq(articles.id, id)).returning();

    if (!deletedArticle.length) {
        throw new HTTPException(404, { message: 'Article not found' });
    }

    return c.json({ message: 'Article deleted', id: deletedArticle[0].id });
})

export default app
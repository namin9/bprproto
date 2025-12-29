import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { categories } from '@bprproto/db/schema' // 공유 스키마에서 categories 테이블 임포트
import { eq } from 'drizzle-orm' // Drizzle ORM의 equal 조건자 임포트
import { AppEnv } from './index'; // index.ts에서 정의한 AppEnv 임포트
import { z } from 'zod'; // 임시 유효성 검사를 위해 Zod 임포트

const app = new Hono<AppEnv>()

// 임시 카테고리 스키마 (나중에 shared/types로 이동)
const categoryInputSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    slug: z.string().min(1, 'Slug is required'),
});

// 모든 카테고리 조회
app.get('/', async (c) => {
    const allCategories = await c.var.db.query.categories.findMany();
    return c.json(allCategories);
})

// 단일 카테고리 조회
app.get('/:id', async (c) => {
    const id = Number(c.req.param('id')); // id는 integer
    const category = await c.var.db.query.categories.findFirst({
        where: eq(categories.id, id),
    });

    if (!category) {
        throw new HTTPException(404, { message: 'Category not found' });
    }
    return c.json(category);
})

// 카테고리 생성
app.post('/', async (c) => {
    const body = await c.req.json();
    const parsed = categoryInputSchema.safeParse(body);
    if (!parsed.success) {
        throw new HTTPException(400, { message: parsed.error.issues.map(issue => issue.message).join(', ') });
    }

    const newCategory = await c.var.db.insert(categories).values({
        ...parsed.data,
        tenantId: c.get('tenantId'), // tenantId는 미들웨어에서 가져옴
    }).returning();

    return c.json(newCategory[0], 201);
})

// 카테고리 업데이트
app.put('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const body = await c.req.json();
    const parsed = categoryInputSchema.partial().safeParse(body);
    if (!parsed.success) {
        throw new HTTPException(400, { message: parsed.error.issues.map(issue => issue.message).join(', ') });
    }

    const updatedCategory = await c.var.db.update(categories)
        .set(parsed.data)
        .where(eq(categories.id, id))
        .returning();

    if (!updatedCategory.length) {
        throw new HTTPException(404, { message: 'Category not found' });
    }

    return c.json(updatedCategory[0]);
})

// 카테고리 삭제
app.delete('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const deletedCategory = await c.var.db.delete(categories).where(eq(categories.id, id)).returning();

    if (!deletedCategory.length) {
        throw new HTTPException(404, { message: 'Category not found' });
    }

    return c.json({ message: 'Category deleted', id: deletedCategory[0].id });
})

export default app
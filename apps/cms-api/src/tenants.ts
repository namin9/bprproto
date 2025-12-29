import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { tenants } from '@bprproto/db/schema' // 공유 스키마에서 tenants 테이블 임포트
import { tenantSchema } from '@bprproto/types' // 공유 타입에서 tenantSchema 임포트
import { eq } from 'drizzle-orm' // Drizzle ORM의 equal 조건자 임포트
import { AppEnv } from './index'; // index.ts에서 정의한 AppEnv 임포트

const app = new Hono<AppEnv>()

// 모든 테넌트 조회
app.get('/', async (c) => {
    const allTenants = await c.var.db.query.tenants.findMany();
    return c.json(allTenants);
})

// 단일 테넌트 조회
app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const tenant = await c.var.db.query.tenants.findFirst({
        where: eq(tenants.id, id),
    });

    if (!tenant) {
        throw new HTTPException(404, { message: 'Tenant not found' });
    }
    return c.json(tenant);
})

// 테넌트 생성
app.post('/', async (c) => {
    const body = await c.req.json();
    const parsed = tenantSchema.omit({ id: true, createdAt: true, updatedAt: true }).safeParse(body); // ID와 타임스탬프는 DB에서 생성
    if (!parsed.success) {
        throw new HTTPException(400, { message: parsed.error.issues.map(issue => issue.message).join(', ') });
    }

    const newTenant = await c.var.db.insert(tenants).values({
        ...parsed.data,
        id: crypto.randomUUID(), // UUID 생성
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
    }).returning();

    return c.json(newTenant[0], 201);
})

// 테넌트 업데이트
app.put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = tenantSchema.omit({ id: true, createdAt: true }).partial().safeParse(body);
    if (!parsed.success) {
        throw new HTTPException(400, { message: parsed.error.issues.map(issue => issue.message).join(', ') });
    }

    const updatedTenant = await c.var.db.update(tenants)
        .set({
            ...parsed.data,
            updatedAt: Math.floor(Date.now() / 1000),
        })
        .where(eq(tenants.id, id))
        .returning();

    if (!updatedTenant.length) {
        throw new HTTPException(404, { message: 'Tenant not found' });
    }

    return c.json(updatedTenant[0]);
})

// 테넌트 삭제
app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const deletedTenant = await c.var.db.delete(tenants).where(eq(tenants.id, id)).returning();

    if (!deletedTenant.length) {
        throw new HTTPException(404, { message: 'Tenant not found' });
    }

    return c.json({ message: 'Tenant deleted', id: deletedTenant[0].id });
})

export default app
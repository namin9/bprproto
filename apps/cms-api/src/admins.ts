import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { admins } from '@bprproto/db/schema' // 공유 스키마에서 admins 테이블 임포트
import { adminSchema } from '@bprproto/types' // 공유 타입에서 adminSchema 임포트
import { eq, and } from 'drizzle-orm'
import { AppEnv } from './index'; // index.ts에서 정의한 AppEnv 임포트
import { hashPassword } from './utils/crypto';

const app = new Hono<AppEnv>()

// 모든 관리자 조회
app.get('/', async (c) => {
    const tenantId = c.get('tenantId');
    const allAdmins = await c.var.db.query.admins.findMany({
        where: eq(admins.tenantId, tenantId)
    });
    return c.json(allAdmins);
})

// 단일 관리자 조회
app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const tenantId = c.get('tenantId');
    const admin = await c.var.db.query.admins.findFirst({
        where: and(eq(admins.id, id), eq(admins.tenantId, tenantId)),
    });

    if (!admin) {
        throw new HTTPException(404, { message: 'Admin not found' });
    }
    return c.json(admin);
})

// 관리자 생성
app.post('/', async (c) => {
    const body = await c.req.json();
    const parsed = adminSchema.omit({ id: true, tenantId: true, createdAt: true }).safeParse(body);
    if (!parsed.success) {
        throw new HTTPException(400, { message: parsed.error.issues.map(issue => issue.message).join(', ') });
    }

    // 비밀번호 해싱 처리 (PASSWORD_SALT 환경 변수 사용)
    if (!body.password) {
        throw new HTTPException(400, { message: 'Password is required' });
    }
    const passwordHash = await hashPassword(body.password, c.env.PASSWORD_SALT);

    const newAdmin = await c.var.db.insert(admins).values({
        ...parsed.data,
        tenantId: c.get('tenantId'),
        id: crypto.randomUUID(), // UUID 생성
        passwordHash,
        createdAt: Math.floor(Date.now() / 1000),
    }).returning();

    return c.json(newAdmin[0], 201);
})

// 관리자 업데이트
app.put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = adminSchema.omit({ id: true, tenantId: true, createdAt: true }).partial().safeParse(body);
    if (!parsed.success) {
        throw new HTTPException(400, { message: parsed.error.issues.map(issue => issue.message).join(', ') });
    }

    const updateData: any = { ...parsed.data };

    // 비밀번호가 요청에 포함된 경우에만 해싱하여 업데이트
    if (body.password) {
        updateData.passwordHash = await hashPassword(body.password, c.env.PASSWORD_SALT);
    }

    const updatedAdmin = await c.var.db.update(admins)
        .set(updateData)
        .where(and(eq(admins.id, id), eq(admins.tenantId, c.get('tenantId'))))
        .returning();

    if (!updatedAdmin.length) {
        throw new HTTPException(404, { message: 'Admin not found' });
    }

    return c.json(updatedAdmin[0]);
})

// 관리자 삭제
app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const deletedAdmin = await c.var.db.delete(admins)
        .where(and(eq(admins.id, id), eq(admins.tenantId, c.get('tenantId'))))
        .returning();

    if (!deletedAdmin.length) {
        throw new HTTPException(404, { message: 'Admin not found' });
    }

    return c.json({ message: 'Admin deleted', id: deletedAdmin[0].id });
})

export default app
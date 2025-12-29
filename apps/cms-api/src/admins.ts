import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { admins } from '@bprproto/db/schema' // 공유 스키마에서 admins 테이블 임포트
import { adminSchema } from '@bprproto/types' // 공유 타입에서 adminSchema 임포트
import { eq } from 'drizzle-orm' // Drizzle ORM의 equal 조건자 임포트
import { AppEnv } from './index'; // index.ts에서 정의한 AppEnv 임포트

const app = new Hono<AppEnv>()

// 모든 관리자 조회
app.get('/', async (c) => {
    const allAdmins = await c.var.db.query.admins.findMany();
    return c.json(allAdmins);
})

// 단일 관리자 조회
app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const admin = await c.var.db.query.admins.findFirst({
        where: eq(admins.id, id),
    });

    if (!admin) {
        throw new HTTPException(404, { message: 'Admin not found' });
    }
    return c.json(admin);
})

// 관리자 생성
app.post('/', async (c) => {
    const body = await c.req.json();
    const parsed = adminSchema.omit({ id: true, createdAt: true }).safeParse(body); // ID와 타임스탬프는 DB에서 생성
    if (!parsed.success) {
        throw new HTTPException(400, { message: parsed.error.issues.map(issue => issue.message).join(', ') });
    }

    // 실제로는 여기에 비밀번호 해싱 로직이 필요합니다.
    const passwordHash = "dummy_hashed_password"; // TODO: 실제 비밀번호 해싱 로직 구현

    const newAdmin = await c.var.db.insert(admins).values({
        ...parsed.data,
        id: crypto.randomUUID(), // UUID 생성
        passwordHash: passwordHash,
        createdAt: Math.floor(Date.now() / 1000),
    }).returning();

    return c.json(newAdmin[0], 201);
})

// 관리자 업데이트
app.put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = adminSchema.omit({ id: true, createdAt: true }).partial().safeParse(body);
    if (!parsed.success) {
        throw new HTTPException(400, { message: parsed.error.issues.map(issue => issue.message).join(', ') });
    }

    const updatedAdmin = await c.var.db.update(admins)
        .set({
            ...parsed.data,
            // 비밀번호 해싱 로직은 별도로 처리해야 합니다.
        })
        .where(eq(admins.id, id))
        .returning();

    if (!updatedAdmin.length) {
        throw new HTTPException(404, { message: 'Admin not found' });
    }

    return c.json(updatedAdmin[0]);
})

// 관리자 삭제
app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const deletedAdmin = await c.var.db.delete(admins).where(eq(admins.id, id)).returning();

    if (!deletedAdmin.length) {
        throw new HTTPException(404, { message: 'Admin not found' });
    }

    return c.json({ message: 'Admin deleted', id: deletedAdmin[0].id });
})

export default app
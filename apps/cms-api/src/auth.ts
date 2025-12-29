import { Hono } from 'hono'
import { sign, verify } from 'hono/jwt'
import { HTTPException } from 'hono/http-exception'
import { admins } from '@bprproto/db/schema'
import { eq, and } from 'drizzle-orm'
import { AppEnv } from './index'
import { hashPassword } from './crypto'

const app = new Hono<AppEnv>()

// 로그인 API
app.post('/login', async (c) => {
    const { email, password } = await c.req.json();
    const tenantId = c.get('tenantId');

    if (!email || !password) {
        throw new HTTPException(400, { message: 'Email and password are required' });
    }

    // 1. 해당 테넌트의 관리자 조회
    const admin = await c.var.db.query.admins.findFirst({
        where: and(
            eq(admins.email, email),
            eq(admins.tenantId, tenantId)
        ),
    });

    if (!admin) {
        throw new HTTPException(401, { message: 'Invalid credentials' });
    }

    // 2. 비밀번호 검증
    const inputHash = await hashPassword(password, c.env.PASSWORD_SALT);
    if (inputHash !== admin.passwordHash) {
        throw new HTTPException(401, { message: 'Invalid credentials' });
    }

    // 3. JWT 발급
    const accessTokenPayload = {
        sub: admin.id,
        email: admin.email,
        tenantId: admin.tenantId,
        role: admin.role,
        exp: Math.floor(Date.now() / 1000) + 60 * 15, // 15분 (Access Token)
    };

    const refreshTokenPayload = {
        sub: admin.id,
        tenantId: admin.tenantId,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7일 (Refresh Token)
    };

    const accessToken = await sign(accessTokenPayload, c.env.JWT_SECRET);
    const refreshToken = await sign(refreshTokenPayload, c.env.JWT_SECRET);

    // KV에 리프레시 토큰 저장 (무효화 및 보안 검증용)
    await c.env.KV.put(`rt:${admin.tenantId}:${admin.id}`, refreshToken, {
        expirationTtl: 60 * 60 * 24 * 7
    });

    return c.json({
        accessToken,
        refreshToken,
        admin: {
            id: admin.id,
            email: admin.email,
            role: admin.role
        }
    });
})

// 토큰 갱신 API
app.post('/refresh', async (c) => {
    const { refreshToken } = await c.req.json();
    if (!refreshToken) throw new HTTPException(400, { message: 'Refresh token required' });

    try {
        const payload = await verify(refreshToken, c.env.JWT_SECRET);
        const adminId = payload.sub as string;
        const tenantId = payload.tenantId as string;

        // KV에서 저장된 토큰과 일치하는지 확인
        const storedToken = await c.env.KV.get(`rt:${tenantId}:${adminId}`);
        if (storedToken !== refreshToken) {
            throw new HTTPException(401, { message: 'Invalid refresh token' });
        }

        // 관리자 정보 재조회 (최신 권한 등 반영)
        const admin = await c.var.db.query.admins.findFirst({
            where: and(eq(admins.id, adminId), eq(admins.tenantId, tenantId))
        });

        if (!admin) throw new HTTPException(401, { message: 'Admin not found' });

        // 새로운 Access Token 발급
        const newAccessToken = await sign({
            sub: admin.id,
            email: admin.email,
            tenantId: admin.tenantId,
            role: admin.role,
            exp: Math.floor(Date.now() / 1000) + 60 * 15,
        }, c.env.JWT_SECRET);

        return c.json({ accessToken: newAccessToken });
    } catch (e) {
        throw new HTTPException(401, { message: 'Invalid or expired refresh token' });
    }
})

// 초기 관리자 생성을 위한 셋업 API (테스트 후 삭제 권장)
app.get('/setup', async (c) => {
    const tenantId = c.get('tenantId');
    const email = 'admin@example.com';
    const password = 'password123'; // 초기 비밀번호

    const existing = await c.var.db.query.admins.findFirst({
        where: and(eq(admins.email, email), eq(admins.tenantId, tenantId))
    });

    if (existing) return c.json({ message: 'Admin already exists' });

    const passwordHash = await hashPassword(password, c.env.PASSWORD_SALT);
    
    await c.var.db.insert(admins).values({
        id: crypto.randomUUID(),
        tenantId,
        email,
        passwordHash,
        role: 'SUPER_ADMIN',
        createdAt: Math.floor(Date.now() / 1000),
    });

    return c.json({ 
        message: 'Initial admin created', 
        credentials: { email, password } 
    });
})

export default app
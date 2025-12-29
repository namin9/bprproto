import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { HTTPException } from 'hono/http-exception'
import { admins } from '@bprproto/db/schema'
import { eq, and } from 'drizzle-orm'
import { AppEnv } from './index'
import { hashPassword } from './utils/crypto'

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
    const payload = {
        sub: admin.id,
        email: admin.email,
        tenantId: admin.tenantId,
        role: admin.role,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24시간 유지
    };

    const token = await sign(payload, c.env.JWT_SECRET);

    return c.json({
        token,
        admin: {
            id: admin.id,
            email: admin.email,
            role: admin.role
        }
    });
})

export default app
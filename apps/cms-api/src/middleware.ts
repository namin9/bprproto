import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { jwt } from 'hono/jwt'

type Bindings = {
  JWT_SECRET: string;
  DB: D1Database; // D1 Database 바인딩
  KV: KVNamespace; // KV Namespace 바인딩
}

type Env = {
    Bindings: Bindings; // Bindings를 Env 타입의 일부로 포함
    Variables: {
        tenantId: string
    }
}

export const tenantIdentification = createMiddleware<Env>(async (c, next) => {
    const hostname = c.req.header('host')
    if (!hostname) {
        throw new HTTPException(400, { message: 'Host header is required' })
    }

    // 실제 Cloudflare KV에서 테넌트 ID를 조회하도록 변경
    const tenantId = await c.env.KV.get(`domain:${hostname}`);
    if (!tenantId) {
        throw new HTTPException(404, { message: `Tenant not found for domain: ${hostname}` });
    }

    c.set('tenantId', tenantId)
    await next()
})

export const authMiddleware = jwt({
    // c.env.JWT_SECRET 사용
    secret: (c) => c.env.JWT_SECRET,
})

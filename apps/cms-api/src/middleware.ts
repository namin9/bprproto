import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { jwt } from 'hono/jwt'

// In a real application, use an environment variable.
const JWT_SECRET = 'a-very-secret-key'

type Env = {
    Variables: {
        tenantId: string
    }
}

export const tenantIdentification = createMiddleware<Env>(async (c, next) => {
    const hostname = c.req.header('host')
    if (!hostname) {
        throw new HTTPException(400, { message: 'Host header is required' })
    }

    // In a real application, you would look up the tenantId from a database or a KV store.
    // For now, we'll use a placeholder.
    const tenantId = 'placeholder-tenant-id'

    c.set('tenantId', tenantId)
    await next()
})

export const authMiddleware = jwt({
    secret: JWT_SECRET,
})
import { Hono } from 'hono'
import { sign } from 'hono/jwt'

// Cloudflare Workers 환경 변수 타입을 정의합니다.
// (나중에 shared/types 등으로 이동할 수 있습니다.)
type Bindings = {
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Bindings }>()

app.post('/login', async (c) => {
    const { email, password } = await c.req.json()

    if (email === 'admin@example.com' && password === 'password') {
        const payload = {
            sub: email,
            role: 'admin',
            exp: Math.floor(Date.now() / 1000) + 60 * 60, // Expires in 1 hour
        }
        // c.env.JWT_SECRET 사용
        const token = await sign(payload, c.env.JWT_SECRET)
        return c.json({ token })
    }

    return c.json({ message: 'Invalid credentials' }, 401)
})

export default app
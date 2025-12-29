import { Hono } from 'hono'
import { sign } from 'hono/jwt'

const app = new Hono()

// In a real application, use an environment variable.
const JWT_SECRET = 'a-very-secret-key'

app.post('/login', async (c) => {
    const { email, password } = await c.req.json()

    // In a real application, you would verify the credentials against the database.
    // For now, we'll use a dummy user.
    if (email === 'admin@example.com' && password === 'password') {
        const payload = {
            sub: email,
            role: 'admin',
            exp: Math.floor(Date.now() / 1000) + 60 * 60, // Expires in 1 hour
        }
        const token = await sign(payload, JWT_SECRET)
        return c.json({ token })
    }

    return c.json({ message: 'Invalid credentials' }, 401)
})

export default app

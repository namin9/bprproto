import { Hono } from 'hono'

const app = new Hono()

// Get all admins (dummy)
app.get('/', (c) => {
    return c.json([
        { id: '1', email: 'admin1@example.com' },
        { id: '2', email: 'admin2@example.com' },
    ])
})

// Get a single admin (dummy)
app.get('/:id', (c) => {
    const id = c.req.param('id')
    return c.json({ id, email: `admin${id}@example.com` })
})

// Create an admin (dummy)
app.post('/', async (c) => {
    const body = await c.req.json()
    return c.json({ message: 'Admin created', data: body }, 201)
})

// Update an admin (dummy)
app.put('/:id', async (c) => {
    const id = c.req.param('id')
    const body = await c.req.json()
    return c.json({ message: `Admin ${id} updated`, data: body })
})

// Delete an admin (dummy)
app.delete('/:id', (c) => {
    const id = c.req.param('id')
    return c.json({ message: `Admin ${id} deleted` })
})

export default app

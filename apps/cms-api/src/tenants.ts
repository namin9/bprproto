import { Hono } from 'hono'

const app = new Hono()

// Get all tenants (dummy)
app.get('/', (c) => {
    return c.json([
        { id: '1', name: 'Tenant 1' },
        { id: '2', name: 'Tenant 2' },
    ])
})

// Get a single tenant (dummy)
app.get('/:id', (c) => {
    const id = c.req.param('id')
    return c.json({ id, name: `Tenant ${id}` })
})

// Create a tenant (dummy)
app.post('/', async (c) => {
    const body = await c.req.json()
    return c.json({ message: 'Tenant created', data: body }, 201)
})

// Update a tenant (dummy)
app.put('/:id', async (c) => {
    const id = c.req.param('id')
    const body = await c.req.json()
    return c.json({ message: `Tenant ${id} updated`, data: body })
})

// Delete a tenant (dummy)
app.delete('/:id', (c) => {
    const id = c.req.param('id')
    return c.json({ message: `Tenant ${id} deleted` })
})

export default app

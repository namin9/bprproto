import { Hono } from 'hono'

const app = new Hono()

// Get all categories (dummy)
app.get('/', (c) => {
    return c.json([
        { id: '1', name: 'Category 1' },
        { id: '2', name: 'Category 2' },
    ])
})

// Get a single category (dummy)
app.get('/:id', (c) => {
    const id = c.req.param('id')
    return c.json({ id, name: `Category ${id}` })
})

// Create a category (dummy)
app.post('/', async (c) => {
    const body = await c.req.json()
    return c.json({ message: 'Category created', data: body }, 201)
})

// Update a category (dummy)
app.put('/:id', async (c) => {
    const id = c.req.param('id')
    const body = await c.req.json()
    return c.json({ message: `Category ${id} updated`, data: body })
})

// Delete a category (dummy)
app.delete('/:id', (c) => {
    const id = c.req.param('id')
    return c.json({ message: `Category ${id} deleted` })
})

export default app

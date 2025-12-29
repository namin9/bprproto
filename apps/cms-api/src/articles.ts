import { Hono } from 'hono'

const app = new Hono()

// Get all articles (dummy)
app.get('/', (c) => {
    return c.json([
        { id: '1', title: 'Article 1' },
        { id: '2', title: 'Article 2' },
    ])
})

// Get a single article (dummy)
app.get('/:id', (c) => {
    const id = c.req.param('id')
    return c.json({ id, title: `Article ${id}` })
})

// Create an article (dummy)
app.post('/', async (c) => {
    const body = await c.req.json()
    return c.json({ message: 'Article created', data: body }, 201)
})

// Update an article (dummy)
app.put('/:id', async (c) => {
    const id = c.req.param('id')
    const body = await c.req.json()
    return c.json({ message: `Article ${id} updated`, data: body })
})

// Delete an article (dummy)
app.delete('/:id', (c) => {
    const id = c.req.param('id')
    return c.json({ message: `Article ${id} deleted` })
})

export default app

import { Hono } from 'hono'

const app = new Hono()

// In a real application, this would be an environment variable
const API_URL = 'http://localhost:8787' // Assuming cms-api runs on 8787

app.get('/', async (c) => {
    const hostname = c.req.header('host')

    // In a real app, you'd use the hostname to fetch tenant-specific content.
    // For now, we'll just fetch the main endpoint of the cms-api.
    try {
        const res = await fetch(`${API_URL}/`)
        const text = await res.text()
        return c.html(`
            <h1>Welcome to the renderer for ${hostname}</h1>
            <p>Content from API: ${text}</p>
        `)
    } catch (err) {
        console.error(err)
        return c.text('Error fetching content from API', 500)
    }
})

export default app
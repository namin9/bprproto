import { Hono } from 'hono'
import { tenantIdentification, authMiddleware } from './middleware'
import auth from './auth'
import tenants from './tenants'
import admins from './admins'
import articles from './articles'
import categories from './categories'

const app = new Hono()

// Tenant identification for all routes
app.use('*', tenantIdentification)

// Auth routes
app.route('/auth', auth)

// Protected API routes
const api = new Hono()
api.use('/*', authMiddleware)
api.get('/me', (c) => {
    const payload = c.get('jwtPayload')
    return c.json({ user: payload })
})

// Mount the APIs
api.route('/tenants', tenants)
api.route('/admins', admins)
api.route('/articles', articles)
api.route('/categories', categories)

app.route('/api', api)

app.get('/', (c) => {
    const tenantId = c.get('tenantId')
    return c.text(`Hello from tenant ${tenantId}!`)
})

export default app

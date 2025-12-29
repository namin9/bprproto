import { Hono } from 'hono'
import { tenantIdentification, authMiddleware, Env as MiddlewareEnv } from './middleware' // Env 임포트
import auth from './auth'
import tenants from './tenants'
import admins from './admins'
import articles from './articles'
import categories from './categories'
import { getDb } from './db' // getDb 임포트

// MiddlewareEnv 타입에서 Bindings를 가져옵니다.
type AppEnv = {
    Bindings: MiddlewareEnv['Bindings'];
    Variables: MiddlewareEnv['Variables'] & {
        db: ReturnType<typeof getDb>; // db 인스턴스를 변수로 추가
    };
}

const app = new Hono<AppEnv>()

// Drizzle DB 인스턴스를 생성하고 context에 주입하는 미들웨어
app.use('*', async (c, next) => {
    const db = getDb(c.env.DB);
    c.set('db', db);
    await next();
});


// Tenant identification for all routes
app.use('*', tenantIdentification)

// Auth routes
app.route('/auth', auth)

// Protected API routes
const api = new Hono<AppEnv>() // api 앱에도 Env 타입 적용
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
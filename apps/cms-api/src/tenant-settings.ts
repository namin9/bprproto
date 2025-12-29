import { Hono } from 'hono'
import { tenants } from '@bprproto/db/schema'
import { eq } from 'drizzle-orm'
import { AppEnv } from './index'
import { HTTPException } from 'hono/http-exception'

const app = new Hono<AppEnv>()

// 테넌트 설정 조회 (현재 로그인된 관리자의 테넌트)
app.get('/', async (c) => {
    const tenantId = c.get('tenantId')
    const tenant = await c.var.db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId)
    })
    
    if (!tenant) {
        throw new HTTPException(404, { message: 'Tenant not found' })
    }

    return c.json({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        customDomain: tenant.customDomain,
        config: tenant.config ? JSON.parse(tenant.config) : {}
    })
})

// 테넌트 설정 업데이트 및 KV 동기화
app.put('/', async (c) => {
    const tenantId = c.get('tenantId')
    const body = await c.req.json()
    
    // 이전 설정을 가져와서 도메인 변경 여부 확인
    const oldTenant = await c.var.db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId)
    })

    if (!oldTenant) {
        throw new HTTPException(404, { message: 'Tenant not found' })
    }

    // 1. D1 데이터베이스 업데이트
    const updated = await c.var.db.update(tenants)
        .set({
            name: body.name,
            customDomain: body.customDomain,
            config: JSON.stringify(body.config),
            updatedAt: Math.floor(Date.now() / 1000)
        })
        .where(eq(tenants.id, tenantId))
        .returning()

    if (updated.length === 0) {
        throw new HTTPException(404, { message: 'Tenant not found' })
    }

    const tenant = updated[0]

    // 2. KV 동기화
    // 도메인이 변경된 경우 이전 도메인 매핑 삭제 (Stale data 방지)
    if (oldTenant.customDomain && oldTenant.customDomain !== tenant.customDomain) {
        await c.env.KV.delete(`domain:${oldTenant.customDomain}`)
    }

    // 새로운 도메인 매핑 추가
    if (tenant.customDomain) {
        await c.env.KV.put(`domain:${tenant.customDomain}`, tenant.id)
    }

    // 테넌트 설정: tenant:config:tenantId -> { id, name, primaryColor, logoUrl, ... }
    const kvConfig = {
        id: tenant.id,
        name: tenant.name,
        ...(body.config || {})
    }
    await c.env.KV.put(`tenant:config:${tenant.id}`, JSON.stringify(kvConfig))

    return c.json({
        message: 'Settings updated and synced to KV',
        tenant: {
            ...tenant,
            config: body.config
        }
    })
})

export default app
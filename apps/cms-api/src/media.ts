import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { AppEnv } from './index'

const app = new Hono<AppEnv>()

// 이미지 업로드 API
app.post('/upload', async (c) => {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!(file instanceof File)) {
        throw new HTTPException(400, { message: 'No file uploaded' });
    }

    // 파일 확장자 및 타입 검증 (이미지 제한)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
        throw new HTTPException(400, { message: 'Only image files are allowed' });
    }

    const tenantId = c.get('tenantId');
    // 프론트엔드에서 변환된 파일의 확장자를 유지하거나, 강제로 .webp로 관리
    const extension = file.name.split('.').pop() || 'webp';
    const fileName = `${tenantId}/${crypto.randomUUID()}.${extension}`;

    try {
        // R2 버킷에 업로드 (최적화는 프론트엔드에서 수행됨을 가정)
        await c.env.R2_BUCKET.put(fileName, await file.arrayBuffer(), {
            httpMetadata: { 
                contentType: file.type,
                cacheControl: 'public, max-age=31536000, immutable'
            },
            customMetadata: {
                tenantId,
                originalName: file.name
            }
        });

        // 업로드된 파일의 URL 반환 (R2 커스텀 도메인 또는 워커 프록시 주소)
        // 실제 운영 환경에서는 R2 버킷에 연결된 도메인 주소를 사용해야 합니다.
        const publicUrl = `https://pub-your-r2-worker-url.com/${fileName}`;

        return c.json({ url: publicUrl, fileName }, 201);
    } catch (e) {
        throw new HTTPException(500, { message: 'Failed to upload to R2' });
    }
});

export default app
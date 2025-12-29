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
    const fileUuid = crypto.randomUUID();
    const fileName = `${tenantId}/${fileUuid}.${extension}`;

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
        const publicUrl = `/api/media/view/${tenantId}/${fileUuid}.${extension}`;

        return c.json({ url: publicUrl, fileName }, 201);
    } catch (e) {
        throw new HTTPException(500, { message: 'Failed to upload to R2' });
    }
});

// 이미지 조회 및 리사이징 API
app.get('/view/:tenantId/:filename', async (c) => {
    const { tenantId, filename } = c.req.param();
    const key = `${tenantId}/${filename}`;
    
    // 쿼리 파라미터 추출 (w: width, h: height, q: quality)
    const width = c.req.query('w');
    const height = c.req.query('h');
    const quality = c.req.query('q') || '80';

    // Cloudflare Image Resizing 옵션 설정
    // 주의: 이 기능은 Cloudflare Pro 플랜 이상 또는 전용 유료 서비스 활성화가 필요합니다.
    // 무료 티어에서는 원본 이미지를 반환하도록 폴백 처리됩니다.
    const resizeOptions = width || height ? {
        width: width ? parseInt(width) : undefined,
        height: height ? parseInt(height) : undefined,
        quality: parseInt(quality),
        format: 'webp',
        fit: 'cover'
    } : null;

    const object = await c.env.R2_BUCKET.get(key);

    if (!object) {
        throw new HTTPException(404, { message: 'Image not found' });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    // 리사이징 옵션이 있고 서비스가 지원되는 경우 Response에 cf 옵션 주입
    // (Worker가 자신을 다시 호출하거나 특정 도메인을 통해 fetch할 때 적용됨)
    const responseOptions: RequestInit & { cf?: any } = { headers };
    if (resizeOptions) {
        responseOptions.cf = { image: resizeOptions };
    }

    return new Response(object.body, responseOptions as ResponseInit);
});

export default app
/** @jsxImportSource hono/jsx */
import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-pages'
import { marked } from 'marked'
import adminUi from '../../cms-api/src/admin'

type Bindings = {
  API_URL: string
  KV: KVNamespace
}

type TenantTheme = {
  id: string
  name: string
  primaryColor?: string
  logoUrl?: string
};

const app = new Hono<{ Bindings: Bindings }>()

// Favicon handler to prevent 404 errors in logs
app.get('/favicon.ico', (c) => c.text('', 204))

// 정적 자산 서빙 설정 (/static/* 경로로 public 폴더 내 파일 접근 가능)
app.use('/static/*', serveStatic())

type SEOProps = {
  title?: string
  description?: string
  image?: string
  type?: 'website' | 'article'
}

// 공통 레이아웃 컴포넌트
const Layout = ({ title, seo, theme, children }: { title: string; seo?: SEOProps; theme?: TenantTheme; children: any }) => {
  const metaTitle = seo?.title || title
  const metaDescription = seo?.description || 'BPR CMS로 구축된 정적 사이트입니다.'
  const metaImage = seo?.image || ''
  const metaType = seo?.type || 'website'
  const primaryColor = theme?.primaryColor || '#2563eb' // 기본값: blue-600

  return (
    <html lang="ko">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />

        {/* Open Graph */}
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content={metaType} />
        {metaImage && <meta property="og:image" content={metaImage} />}

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        {metaImage && <meta name="twitter:image" content={metaImage} />}

        <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --primary-color: ${primaryColor};
          }
          .text-primary { color: var(--primary-color); }
          .bg-primary { background-color: var(--primary-color); }
          .border-primary { border-color: var(--primary-color); }
          .hover\\:text-primary:hover { color: var(--primary-color); }
        `}} />
      </head>
      <body className="bg-slate-50 text-slate-900 font-sans">
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
            <a href="/" className="flex items-center gap-2 text-xl font-black tracking-tight text-primary">
              {theme?.logoUrl && <img src={theme.logoUrl} alt={theme.name} className="h-8 w-auto" />}
              <span>{theme?.name || 'BPR READER'}</span>
            </a>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-12">
          {children}
        </main>
        <footer className="max-w-4xl mx-auto px-6 py-12 border-t text-center text-slate-400 text-sm">
          &copy; 2025 BPR CMS Renderer. Powered by Cloudflare Pages.
        </footer>
      </body>
    </html>
  )
}

// 테넌트 테마 조회 헬퍼
async function getTenantTheme(c: any): Promise<TenantTheme | undefined> {
  const host = c.req.header('host') || '';
  // 1. 도메인으로 테넌트 ID 조회
  const tenantId = await c.env.KV.get(`domain:${host}`);
  if (!tenantId) return undefined;

  // 2. 테넌트 설정 조회
  const configStr = await c.env.KV.get(`tenant:config:${tenantId}`);
  if (!configStr) return { id: tenantId, name: 'BPR CMS' };

  return JSON.parse(configStr);
}

// 메인 페이지: 게시글 목록
app.get('/', async (c) => {
  const apiUrl = c.env.API_URL
  const host = c.req.header('host')
  const theme = await getTenantTheme(c)
  
  if (!theme) {
    return c.html(<Layout title="404 Not Found"><div className="text-center py-20"><h1 className="text-2xl font-bold">등록되지 않은 사이트입니다.</h1><p className="text-slate-500 mt-2">도메인 설정을 확인해주세요.</p></div></Layout>, 404)
  }

  // API 호출 시 현재 접속한 Host 정보를 전달하여 테넌트 식별 유도
  const res = await fetch(`${apiUrl}/public/articles`, {
    headers: { 'x-forwarded-host': host || '' }
  })
  
  if (!res.ok) return c.text('게시글을 불러오는 중 오류가 발생했습니다.', 500)
  const articles = await res.json() as any[]

  return c.html(
    <Layout title={theme?.name || "블로그 홈"} theme={theme} seo={{ description: 'BPR CMS로 관리되는 최신 소식을 확인하세요.' }}>
      <div className="space-y-16">
        {articles.length === 0 && <p className="text-center text-slate-500 py-20">아직 작성된 게시글이 없습니다.</p>}
        {articles.map(article => (
          <article key={article.id} className="group relative flex flex-col items-start">
            {article.thumbnailUrl && (
              <div className="mb-4 overflow-hidden rounded-lg bg-slate-200 w-full aspect-video">
                <img src={`${article.thumbnailUrl}?w=800&q=75`} alt="" className="object-cover w-full h-full group-hover:scale-105 transition duration-300" />
              </div>
            )}
            <h2 className="text-3xl font-bold mb-3 group-hover:text-blue-600 transition">
              <a href={`/post/${article.slug}`}>
                <span className="absolute -inset-y-2.5 -inset-x-4 md:-inset-y-4 md:-inset-x-6 sm:rounded-2xl"></span>
                <span className="relative z-10">{article.title}</span>
              </a>
            </h2>
            <time className="relative z-10 order-first mb-3 flex items-center text-sm text-slate-400 pl-3.5">
              <span className="absolute inset-y-0 left-0 flex items-center" aria-hidden="true">
                <span className="h-4 w-0.5 rounded-full bg-slate-200"></span>
              </span>
              {new Date(article.publishedAt * 1000).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </time>
            <p className="relative z-10 mt-2 text-sm text-slate-600 leading-relaxed line-clamp-3">
              {article.content?.substring(0, 250)}...
            </p>
            <div className="relative z-10 mt-4 flex items-center text-sm font-medium text-primary">
              더 읽어보기
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="ml-1 h-4 w-4 stroke-current"><path d="M6.75 5.75 9.25 8l-2.5 2.25" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path></svg>
            </div>
          </article>
        ))}
      </div>
    </Layout>
  )
})

// 상세 페이지: 게시글 내용
app.get('/post/:slug', async (c) => {
  const apiUrl = c.env.API_URL
  const slug = c.req.param('slug')
  const host = c.req.header('host')
  const theme = await getTenantTheme(c)

  if (!theme) {
    return c.notFound()
  }

  const res = await fetch(`${apiUrl}/public/articles/${slug}`, {
    headers: { 'x-forwarded-host': host || '' }
  })

  if (!res.ok) return c.notFound()
  const article = await res.json() as any

  const seoMeta = article.seoMeta ? (typeof article.seoMeta === 'string' ? JSON.parse(article.seoMeta) : article.seoMeta) : {}
  const seo: SEOProps = {
    title: seoMeta.title || article.title,
    description: seoMeta.description || article.content?.substring(0, 160).replace(/\n/g, ' '),
    image: article.thumbnailUrl,
    type: 'article'
  }

  // Markdown을 HTML로 변환
  const contentHtml = await marked.parse(article.content || '')

  return c.html(
    <Layout title={article.title} theme={theme} seo={seo}>
      <article className="prose prose-slate max-w-none">
        <header className="mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl mb-4">{article.title}</h1>
          <div className="text-slate-400 text-sm">발행일: {new Date(article.publishedAt * 1000).toLocaleDateString()}</div>
        </header>
        <div className="mt-8 text-slate-700 leading-8" dangerouslySetInnerHTML={{ __html: contentHtml }} />
      </article>
    </Layout>
  )
})

// Admin UI 마운트 (Pages 도메인에서도 /admin 접근 가능)
app.route('/admin', adminUi as any)

export default app
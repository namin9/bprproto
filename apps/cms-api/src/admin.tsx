/** @jsxImportSource hono/jsx */
import { Hono } from 'hono'
import { AppEnv } from './index'

const admin = new Hono<AppEnv>()

const Layout = ({ title, headContent, children, apiUrl }: { title: string; headContent?: any; children: any; apiUrl?: string }) => (
    <html lang="ko">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <link rel="icon" href="data:;base64,iVBORw0KGgo=" />
            <title>{title} - BPR Admin</title>
            <script src="https://cdn.tailwindcss.com"></script>
            {headContent}
        </head>
        <body class="bg-gray-100 min-h-screen">
            <div id="toast-container" class="fixed bottom-4 right-4 z-50 flex flex-col gap-2"></div>
            <script dangerouslySetInnerHTML={{ __html: `
                window.showToast = (message, type = 'success') => {
                    const container = document.getElementById('toast-container');
                    const toast = document.createElement('div');
                    const bgColor = type === 'error' ? 'bg-red-600' : 'bg-green-600';
                    toast.className = \`px-6 py-3 rounded shadow-lg text-white transition-all duration-500 transform translate-y-10 opacity-0 \${bgColor}\`;
                    toast.textContent = message;
                    container.appendChild(toast);
                    setTimeout(() => { toast.classList.remove('translate-y-10', 'opacity-0'); }, 10);
                    setTimeout(() => {
                        toast.classList.add('opacity-0');
                        setTimeout(() => toast.remove(), 500);
                    }, 3000);
                };
                window.setLoading = (btn, isLoading, loadingText = '처리 중...') => {
                    if (isLoading) {
                        btn.dataset.originalText = btn.textContent;
                        btn.disabled = true;
                        btn.textContent = loadingText;
                    } else {
                        btn.disabled = false;
                        btn.textContent = btn.dataset.originalText;
                    }
                };
                // API Fetch Wrapper with Auto Refresh
                window.apiFetch = async (url, options = {}) => {
                    const apiUrl = '${apiUrl?.replace(/\/$/, '') || ''}';
                    const fullUrl = url.startsWith('http') ? url : apiUrl + url;
                    let token = localStorage.getItem('accessToken');
                    const headers = { 
                        ...options.headers, 
                        'Authorization': 'Bearer ' + token,
                        'x-forwarded-host': window.location.host 
                    };
                    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
                        headers['Content-Type'] = 'application/json';
                    }
                    let res = await fetch(fullUrl, { ...options, headers });
                    
                    // Access Token 만료 시 리프레시 시도
                    if (res.status === 401 && !url.includes('/auth/')) {
                        const refreshToken = localStorage.getItem('refreshToken');
                        if (refreshToken) {
                            const refreshRes = await fetch(apiUrl + '/auth/refresh', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ refreshToken })
                            });
                            if (refreshRes.ok) {
                                const { accessToken } = await refreshRes.json();
                                localStorage.setItem('accessToken', accessToken);
                                headers['Authorization'] = 'Bearer ' + accessToken;
                                res = await fetch(url, { ...options, headers });
                            } else {
                                localStorage.clear();
                                location.href = '/admin/login';
                            }
                        }
                    }
                    return res;
                };
            `}} />
            {children}
        </body>
    </html>
)

admin.get('/login', (c) => {
    const apiUrl = (c.env as any).API_URL || '';
    return c.html(
        <Layout title="로그인" apiUrl={apiUrl}>
            <div class="flex items-center justify-center min-h-screen">
                <div class="p-8 bg-white rounded shadow-md w-96">
                    <h1 class="text-2xl font-bold mb-6 text-center">BPR CMS 관리자</h1>
                    <form id="login-form" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">이메일</label>
                            <input type="email" name="email" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">비밀번호</label>
                            <input type="password" name="password" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                        </div>
                        <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition">
                            로그인
                        </button>
                    </form>
                    <script dangerouslySetInnerHTML={{ __html: `
                        document.getElementById('login-form').onsubmit = async (e) => {
                            e.preventDefault();
                            const apiUrl = '${apiUrl || ''}';
                            const btn = e.target.querySelector('button');
                            setLoading(btn, true, '로그인 중...');
                            const formData = new FormData(e.target);
                            const data = Object.fromEntries(formData);
                            const res = await fetch(apiUrl + '/auth/login', {
                                method: 'POST',
                                headers: { 
                                    'Content-Type': 'application/json',
                                    'x-forwarded-host': window.location.host
                                },
                                body: JSON.stringify(data)
                            });
                            setLoading(btn, false);
                            if (res.ok) {
                                const { accessToken, refreshToken } = await res.json();
                                localStorage.setItem('accessToken', accessToken);
                                localStorage.setItem('refreshToken', refreshToken);
                                location.href = '/admin/dashboard';
                            } else {
                                showToast('로그인에 실패했습니다. 정보를 확인해주세요.', 'error');
                            }
                        };
                    `}} />
                </div>
            </div>
        </Layout>
    )
})

admin.get('/dashboard', (c) => {
    const apiUrl = (c.env as any).API_URL || '';
    return c.html(
        <Layout title="대시보드" apiUrl={apiUrl}>
            <nav class="bg-white shadow-sm p-4">
                <div class="max-w-7xl mx-auto flex justify-between items-center">
                    <span class="font-bold text-xl">BPR Admin</span>
                    <div class="flex items-center space-x-4">
                        <span id="user-email" class="text-sm text-gray-600"></span>
                        <button onclick="localStorage.clear(); location.href='/admin/login'" class="text-sm text-red-600">로그아웃</button>
                    </div>
                </div>
            </nav>
            <main class="max-w-7xl mx-auto p-6">
                <h2 class="text-2xl font-semibold mb-4">환영합니다!</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-white p-6 rounded shadow">
                        <h3 class="font-bold mb-2 text-gray-500 uppercase text-xs tracking-wider">전체 게시글</h3>
                        <p id="stat-articles" class="text-3xl font-bold mb-4">-</p>
                        <a href="/admin/articles" class="text-blue-600 hover:underline">이동하기 &rarr;</a>
                    </div>
                    <div class="bg-white p-6 rounded shadow">
                        <h3 class="font-bold mb-2 text-gray-500 uppercase text-xs tracking-wider">카테고리</h3>
                        <p id="stat-categories" class="text-3xl font-bold mb-4">-</p>
                        <a href="/admin/media" class="text-blue-600 hover:underline">이동하기 &rarr;</a>
                    </div>
                    <div class="bg-white p-6 rounded shadow">
                        <h3 class="font-bold mb-2 text-gray-500 uppercase text-xs tracking-wider">관리자 계정</h3>
                        <p id="stat-admins" class="text-3xl font-bold mb-4">-</p>
                        <a href="/admin/settings" class="text-blue-600 hover:underline">이동하기 &rarr;</a>
                    </div>
                </div>
            </main>
            <script dangerouslySetInnerHTML={{ __html: `
                const accessToken = localStorage.getItem('accessToken');
                if (!accessToken) location.href = '/admin/login';
                
                async function loadStats() {
                    try {
                        const res = await apiFetch('/api/stats');
                        const stats = await res.json();
                        document.getElementById('stat-articles').textContent = stats.articles;
                        document.getElementById('stat-categories').textContent = stats.categories;
                        document.getElementById('stat-admins').textContent = stats.admins;
                    } catch (err) {
                        console.error('Failed to load stats');
                    }
                }
                loadStats();

                // 간단한 토큰 체크 (실제로는 /api/me 호출 권장)
                const payload = JSON.parse(atob(accessToken.split('.')[1]));
                document.getElementById('user-email').textContent = payload.email;
            `}} />
        </Layout>
    )
})

// 게시글 목록 페이지
admin.get('/articles', (c) => {
    const apiUrl = (c.env as any).API_URL || '';
    return c.html(
        <Layout title="게시글 관리" apiUrl={apiUrl}>
            <div class="max-w-7xl mx-auto p-6">
                <div class="flex justify-between items-center mb-6">
                    <h1 class="text-2xl font-bold">게시글 목록</h1>
                    <a href="/admin/articles/new" class="bg-blue-600 text-white px-4 py-2 rounded-md">새 글 작성</a>
                </div>
                <div class="bg-white shadow rounded-lg overflow-hidden">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">제목</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">작성일</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">관리</th>
                            </tr>
                        </thead>
                        <tbody id="articles-list" class="bg-white divide-y divide-gray-200">
                            {/* 데이터는 클라이언트에서 로드 */}
                        </tbody>
                    </table>
                </div>
            </div>
            <script dangerouslySetInnerHTML={{ __html: `
                async function loadArticles() {
                    const res = await apiFetch('/api/articles');
                    const articles = await res.json();
                    const tbody = document.getElementById('articles-list');
                    tbody.innerHTML = articles.map(a => \`
                        <tr class="hover:bg-gray-50">
                            <td class="px-6 py-4 font-medium text-blue-600 cursor-pointer" onclick="location.href='/admin/articles/\${a.id}'">\${a.title}</td>
                            <td class="px-6 py-4 cursor-pointer" onclick="location.href='/admin/articles/\${a.id}'">\${a.isPublic ? '공개' : '임시저장'}</td>
                            <td class="px-6 py-4 text-sm text-gray-500 cursor-pointer" onclick="location.href='/admin/articles/\${a.id}'">\${new Date(a.createdAt * 1000).toLocaleDateString()}</td>
                            <td class="px-6 py-4 text-right text-sm font-medium">
                                <button onclick="deleteArticle(\${a.id}, '\${a.title.replace(/'/g, "\\\\'")}')" class="text-red-600 hover:text-red-900">삭제</button>
                            </td>
                        </tr>
                    \`).join('');
                }

                async function deleteArticle(id, title) {
                    if (!confirm(\`'\${title}' 게시글을 삭제하시겠습니까?\`)) return;
                    showToast('삭제 중...');
                    const res = await apiFetch('/api/articles/' + id, { method: 'DELETE' });
                    if (res.ok) {
                        showToast('게시글이 삭제되었습니다.');
                        loadArticles();
                    } else {
                        showToast('삭제에 실패했습니다.', 'error');
                    }
                }

                loadArticles();
            `}} />
        </Layout>
    )
})

// 새 게시글 작성 페이지
admin.get('/articles/new', (c) => {
    const apiUrl = (c.env as any).API_URL || '';
    const head = (
        <>
            <link rel="stylesheet" href="https://unpkg.com/easymde/dist/easymde.min.css" />
            <script src="https://unpkg.com/easymde/dist/easymde.min.js"></script>
            <style>{`
                .editor-toolbar { background: white !important; border-color: #d1d5db !important; }
                .CodeMirror { border-color: #d1d5db !important; border-bottom-left-radius: 0.375rem !important; border-bottom-right-radius: 0.375rem !important; }
            `}</style>
        </>
    )
    return c.html(
        <Layout title="새 글 작성" headContent={head} apiUrl={apiUrl}>
            <div class="max-w-4xl mx-auto p-6">
                <h1 class="text-2xl font-bold mb-6">새 게시글 작성</h1>
                <form id="article-form" class="space-y-4 bg-white p-6 rounded shadow">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">제목</label>
                        <input type="text" name="title" required class="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">슬러그 (URL)</label>
                        <input type="text" name="slug" required placeholder="example-post-title" class="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">내용 (Markdown)</label>
                        <textarea name="content" id="content-editor"></textarea>
                    </div>
                    <div class="flex items-center">
                        <input type="checkbox" name="isPublic" id="isPublic" class="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                        <label for="isPublic" class="ml-2 block text-sm text-gray-900">즉시 공개</label>
                    </div>
                    <button type="submit" class="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700">저장하기</button>
                </form>
            </div>
            <script dangerouslySetInnerHTML={{ __html: `
                const easymde = new EasyMDE({ 
                    element: document.getElementById('content-editor'),
                    spellChecker: false,
                    placeholder: "내용을 입력하세요...",
                    status: false,
                    minHeight: "300px"
                });

                document.getElementById('article-form').onsubmit = async (e) => {
                    e.preventDefault();
                    const btn = e.target.querySelector('button');
                    setLoading(btn, true, '저장 중...');
                    const formData = new FormData(e.target);
                    const data = Object.fromEntries(formData);
                    data.isPublic = formData.get('isPublic') === 'on';
                    data.content = easymde.value();
                    
                    const res = await apiFetch('/api/articles', {
                        method: 'POST',
                        body: JSON.stringify(data)
                    });
                    setLoading(btn, false);
                    if (res.ok) {
                        showToast('게시글이 저장되었습니다.');
                        location.href = '/admin/articles';
                    } else {
                        showToast('저장에 실패했습니다.', 'error');
                    }
                };
            `}} />
        </Layout>
    )
})

// 게시글 수정 페이지
admin.get('/articles/:id', (c) => {
    const apiUrl = (c.env as any).API_URL || '';
    const id = c.req.param('id');
    const head = (
        <>
            <link rel="stylesheet" href="https://unpkg.com/easymde/dist/easymde.min.css" />
            <script src="https://unpkg.com/easymde/dist/easymde.min.js"></script>
            <style>{`
                .editor-toolbar { background: white !important; border-color: #d1d5db !important; }
                .CodeMirror { border-color: #d1d5db !important; border-bottom-left-radius: 0.375rem !important; border-bottom-right-radius: 0.375rem !important; }
            `}</style>
        </>
    )
    return c.html(
        <Layout title="게시글 수정" headContent={head} apiUrl={apiUrl}>
            <div class="max-w-4xl mx-auto p-6">
                <h1 class="text-2xl font-bold mb-6">게시글 수정</h1>
                <form id="edit-article-form" class="space-y-4 bg-white p-6 rounded shadow">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">제목</label>
                        <input type="text" name="title" id="edit-title" required class="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">슬러그 (URL)</label>
                        <input type="text" name="slug" id="edit-slug" required placeholder="example-post-title" class="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">내용 (Markdown)</label>
                        <textarea name="content" id="edit-content-editor"></textarea>
                    </div>
                    <div class="flex items-center">
                        <input type="checkbox" name="isPublic" id="edit-isPublic" class="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                        <label for="edit-isPublic" class="ml-2 block text-sm text-gray-900">즉시 공개</label>
                    </div>
                    <div class="flex justify-between">
                        <button type="button" onclick="history.back()" class="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600">취소</button>
                        <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">수정 완료</button>
                    </div>
                </form>
            </div>
            <script dangerouslySetInnerHTML={{ __html: `
                const easymde = new EasyMDE({ 
                    element: document.getElementById('edit-content-editor'),
                    spellChecker: false,
                    placeholder: "내용을 입력하세요...",
                    status: false,
                    minHeight: "300px"
                });

                const articleId = "${id}";

                async function loadArticle() {
                    const res = await apiFetch('/api/articles/' + articleId);
                    if (!res.ok) {
                        showToast('게시글을 불러오지 못했습니다.', 'error');
                        location.href = '/admin/articles';
                        return;
                    }
                    const article = await res.json();
                    document.getElementById('edit-title').value = article.title;
                    document.getElementById('edit-slug').value = article.slug;
                    document.getElementById('edit-isPublic').checked = article.isPublic === 1 || article.isPublic === true;
                    easymde.value(article.content || '');
                }

                document.getElementById('edit-article-form').onsubmit = async (e) => {
                    e.preventDefault();
                    const btn = e.target.querySelector('button[type="submit"]');
                    setLoading(btn, true, '수정 중...');
                    const formData = new FormData(e.target);
                    const data = Object.fromEntries(formData);
                    data.isPublic = document.getElementById('edit-isPublic').checked;
                    data.content = easymde.value();
                    
                    const res = await apiFetch('/api/articles/' + articleId, {
                        method: 'PUT',
                        body: JSON.stringify(data)
                    });
                    setLoading(btn, false);
                    if (res.ok) {
                        showToast('게시글이 수정되었습니다.');
                        location.href = '/admin/articles';
                    } else {
                        showToast('수정에 실패했습니다.', 'error');
                    }
                };

                loadArticle();
            `}} />
        </Layout>
    )
})

// 미디어 라이브러리 페이지 (클라이언트 사이드 WebP 변환 포함)
admin.get('/media', (c) => {
    const apiUrl = (c.env as any).API_URL || '';
    return c.html(
        <Layout title="미디어 라이브러리" apiUrl={apiUrl}>
            <div class="max-w-7xl mx-auto p-6">
                <h1 class="text-2xl font-bold mb-6">미디어 업로드</h1>
                <div class="bg-white p-6 rounded shadow mb-6">
                    <input type="file" id="file-input" accept="image/*" class="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    <div id="preview-container" class="hidden mb-4">
                        <p class="text-sm text-gray-500 mb-2">최적화 미리보기 (WebP):</p>
                        <img id="image-preview" class="max-w-xs rounded border" />
                    </div>
                    <button id="upload-btn" disabled class="bg-blue-600 text-white px-6 py-2 rounded-md disabled:bg-gray-400">최적화 및 업로드</button>
                </div>
            </div>
            <script dangerouslySetInnerHTML={{ __html: `
                const fileInput = document.getElementById('file-input');
                const uploadBtn = document.getElementById('upload-btn');
                const previewImg = document.getElementById('image-preview');
                const previewContainer = document.getElementById('preview-container');
                let optimizedBlob = null;

                fileInput.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    // Canvas를 이용한 WebP 변환
                    const img = new Image();
                    img.src = URL.createObjectURL(file);
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        
                        canvas.toBlob((blob) => {
                            optimizedBlob = blob;
                            previewImg.src = URL.createObjectURL(blob);
                            previewContainer.classList.remove('hidden');
                            uploadBtn.disabled = false;
                        }, 'image/webp', 0.8); // 품질 0.8 설정
                    };
                };

                uploadBtn.onclick = async () => {
                    if (!optimizedBlob) return;
                    
                    uploadBtn.disabled = true;
                    uploadBtn.textContent = '업로드 중...';
                    
                    const formData = new FormData();
                    // 원본 파일명에서 확장자만 바꿈
                    const originalName = fileInput.files[0].name.split('.')[0];
                    formData.append('file', optimizedBlob, originalName + '.webp');

                    try {
                        const res = await apiFetch('/api/media/upload', {
                            method: 'POST',
                            body: formData
                        });
                        
                        if (res.ok) {
                            const result = await res.json();
                            showToast('이미지가 업로드되었습니다.');
                            location.reload();
                        } else {
                            showToast('업로드에 실패했습니다.', 'error');
                        }
                    } catch (err) {
                        showToast('오류가 발생했습니다.', 'error');
                    } finally {
                        uploadBtn.disabled = false;
                        uploadBtn.textContent = '최적화 및 업로드';
                    }
                };
            `}} />
        </Layout>
    )
})

// 사이트 설정 페이지
admin.get('/settings', (c) => {
    const apiUrl = (c.env as any).API_URL || '';
    return c.html(
        <Layout title="사이트 설정" apiUrl={apiUrl}>
            <div class="max-w-4xl mx-auto p-6">
                <h1 class="text-2xl font-bold mb-6">사이트 설정</h1>
                <form id="settings-form" class="space-y-6 bg-white p-6 rounded shadow">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">사이트 이름</label>
                        <input type="text" name="name" id="setting-name" required class="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">커스텀 도메인</label>
                        <input type="text" name="customDomain" id="setting-domain" placeholder="example.com" class="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                        <p class="mt-1 text-xs text-gray-500">Cloudflare Pages에 연결된 도메인을 입력하세요.</p>
                    </div>
                    <div class="border-t pt-4">
                        <h3 class="text-lg font-medium mb-4">테마 설정</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">브랜드 색상 (Primary Color)</label>
                                <div class="flex items-center gap-2 mt-1">
                                    <input type="color" id="setting-color-picker" class="h-10 w-10 border-0 p-0 cursor-pointer" />
                                    <input type="text" name="primaryColor" id="setting-color-text" placeholder="#2563eb" class="block w-full border border-gray-300 rounded-md p-2" />
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">로고 URL</label>
                                <input type="text" name="logoUrl" id="setting-logo" placeholder="https://..." class="mt-1 block w-full border border-gray-300 rounded-md p-2" />
                            </div>
                        </div>
                    </div>
                    <div class="flex justify-end">
                        <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition">설정 저장</button>
                    </div>
                </form>
            </div>
            <script dangerouslySetInnerHTML={{ __html: `
                const colorPicker = document.getElementById('setting-color-picker');
                const colorText = document.getElementById('setting-color-text');
                
                colorPicker.oninput = (e) => colorText.value = e.target.value;
                colorText.oninput = (e) => colorPicker.value = e.target.value;

                async function loadSettings() {
                    const res = await apiFetch('/api/settings');
                    if (!res.ok) return;
                    
                    const data = await res.json();
                    document.getElementById('setting-name').value = data.name || '';
                    document.getElementById('setting-domain').value = data.customDomain || '';
                    
                    const config = data.config || {};
                    colorText.value = config.primaryColor || '#2563eb';
                    colorPicker.value = config.primaryColor || '#2563eb';
                    document.getElementById('setting-logo').value = config.logoUrl || '';
                }

                document.getElementById('settings-form').onsubmit = async (e) => {
                    e.preventDefault();
                    const btn = e.target.querySelector('button');
                    setLoading(btn, true, '저장 중...');
                    const formData = new FormData(e.target);
                    const payload = {
                        name: formData.get('name'),
                        customDomain: formData.get('customDomain'),
                        config: {
                            primaryColor: formData.get('primaryColor'),
                            logoUrl: formData.get('logoUrl')
                        }
                    };
                    
                    const res = await apiFetch('/api/settings', {
                        method: 'PUT',
                        body: JSON.stringify(payload)
                    });
                    
                    setLoading(btn, false);
                    if (res.ok) {
                        showToast('설정이 저장되었습니다.');
                        setTimeout(() => location.reload(), 1000);
                    } else {
                        showToast('저장에 실패했습니다.', 'error');
                    }
                };

                loadSettings();
            `}} />
        </Layout>
    )
})

export default admin
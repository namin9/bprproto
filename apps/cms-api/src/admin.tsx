/** @jsx jsx */
import { Hono } from 'hono'
import { jsx } from 'hono/jsx'
import { AppEnv } from '../index'

const admin = new Hono<AppEnv>()

const Layout = ({ title, children }: { title: string; children: any }) => (
    <html lang="ko">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>{title} - BPR Admin</title>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-100 min-h-screen">
            {children}
        </body>
    </html>
)

admin.get('/login', (c) => {
    return c.html(
        <Layout title="로그인">
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
                            const formData = new FormData(e.target);
                            const data = Object.fromEntries(formData);
                            const res = await fetch('/auth/login', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(data)
                            });
                            if (res.ok) {
                                const { token } = await res.json();
                                localStorage.setItem('token', token);
                                location.href = '/admin/dashboard';
                            } else {
                                alert('로그인 실패');
                            }
                        };
                    `}} />
                </div>
            </div>
        </Layout>
    )
})

admin.get('/dashboard', (c) => {
    return c.html(
        <Layout title="대시보드">
            <nav class="bg-white shadow-sm p-4">
                <div class="max-w-7xl mx-auto flex justify-between items-center">
                    <span class="font-bold text-xl">BPR Admin</span>
                    <div class="flex items-center space-x-4">
                        <span id="user-email" class="text-sm text-gray-600"></span>
                        <button onclick="localStorage.removeItem('token'); location.href='/admin/login'" class="text-sm text-red-600">로그아웃</button>
                    </div>
                </div>
            </nav>
            <main class="max-w-7xl mx-auto p-6">
                <h2 class="text-2xl font-semibold mb-4">환영합니다!</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-white p-6 rounded shadow">
                        <h3 class="font-bold mb-2">콘텐츠 관리</h3>
                        <p class="text-gray-600 text-sm mb-4">게시글을 작성하고 관리합니다.</p>
                        <a href="/admin/articles" class="text-blue-600 hover:underline">이동하기 &rarr;</a>
                    </div>
                    <div class="bg-white p-6 rounded shadow">
                        <h3 class="font-bold mb-2">미디어 라이브러리</h3>
                        <p class="text-gray-600 text-sm mb-4">이미지를 업로드하고 관리합니다.</p>
                        <a href="/admin/media" class="text-blue-600 hover:underline">이동하기 &rarr;</a>
                    </div>
                </div>
            </main>
            <script dangerouslySetInnerHTML={{ __html: `
                const token = localStorage.getItem('token');
                if (!token) location.href = '/admin/login';
                
                // 간단한 토큰 체크 (실제로는 /api/me 호출 권장)
                const payload = JSON.parse(atob(token.split('.')[1]));
                document.getElementById('user-email').textContent = payload.email;
            `}} />
        </Layout>
    )
})

// 게시글 목록 페이지
admin.get('/articles', (c) => {
    return c.html(
        <Layout title="게시글 관리">
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
                    const token = localStorage.getItem('token');
                    const res = await fetch('/api/articles', {
                        headers: { 'Authorization': 'Bearer ' + token }
                    });
                    const articles = await res.json();
                    const tbody = document.getElementById('articles-list');
                    tbody.innerHTML = articles.map(a => \`
                        <tr>
                            <td class="px-6 py-4">\${a.title}</td>
                            <td class="px-6 py-4">\${a.isPublic ? '공개' : '임시저장'}</td>
                            <td class="px-6 py-4 text-sm text-gray-500">\${new Date(a.createdAt * 1000).toLocaleDateString()}</td>
                        </tr>
                    \`).join('');
                }
                loadArticles();
            `}} />
        </Layout>
    )
})

// 새 게시글 작성 페이지
admin.get('/articles/new', (c) => {
    return c.html(
        <Layout title="새 글 작성">
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
                        <label class="block text-sm font-medium text-gray-700">내용</label>
                        <textarea name="content" rows={10} class="mt-1 block w-full border border-gray-300 rounded-md p-2"></textarea>
                    </div>
                    <div class="flex items-center">
                        <input type="checkbox" name="isPublic" id="isPublic" class="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                        <label for="isPublic" class="ml-2 block text-sm text-gray-900">즉시 공개</label>
                    </div>
                    <button type="submit" class="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700">저장하기</button>
                </form>
            </div>
            <script dangerouslySetInnerHTML={{ __html: `
                document.getElementById('article-form').onsubmit = async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    const data = Object.fromEntries(formData);
                    data.isPublic = formData.get('isPublic') === 'on';
                    
                    const res = await fetch('/api/articles', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + localStorage.getItem('token')
                        },
                        body: JSON.stringify(data)
                    });
                    if (res.ok) {
                        location.href = '/admin/articles';
                    } else {
                        alert('저장 실패');
                    }
                };
            `}} />
        </Layout>
    )
})

// 미디어 라이브러리 페이지 (클라이언트 사이드 WebP 변환 포함)
admin.get('/media', (c) => {
    return c.html(
        <Layout title="미디어 라이브러리">
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
                        const res = await fetch('/api/media/upload', {
                            method: 'POST',
                            headers: { 
                                'Authorization': 'Bearer ' + localStorage.getItem('token')
                            },
                            body: formData
                        });
                        
                        if (res.ok) {
                            const result = await res.json();
                            alert('업로드 성공! URL: ' + result.url);
                            location.reload();
                        } else {
                            alert('업로드 실패');
                        }
                    } catch (err) {
                        alert('오류 발생');
                    } finally {
                        uploadBtn.disabled = false;
                        uploadBtn.textContent = '최적화 및 업로드';
                    }
                };
            `}} />
        </Layout>
    )
})

export default admin
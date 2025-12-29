# 엔터프라이즈 정적 CMS 프로젝트 개발 현황 (2025-12-30, 최종 배포 및 안정화 단계)

이 문서는 엔터프라이즈 정적 CMS 프로젝트의 현재 개발 현황을 요약합니다.

## 완료된 작업

- [x] **모노레포 및 기본 구조 설정**
  - [x] `pnpm` 워크스페이스 기반 모노레포 구조 생성 (`apps`, `packages`).
  - [x] Drizzle ORM 및 Zod를 사용한 공유 패키지(`db`, `types`) 구현.
  - [x] Cloudflare D1/KV 네임스페이스 정보로 `wrangler.toml` 구성.
  - [x] GitHub Actions 기본 CI 파이프라인 생성.

- [x] **`cms-api`: 핵심 로직 구현**
  - [x] Hono 기반 프로젝트 초기화.
  - [x] **인증**: JWT 기반 인증 시스템 구현 및 Cloudflare 환경 변수(`c.env.JWT_SECRET`) 연동.
  - [x] **테넌트 식별**: Cloudflare KV(`c.env.KV`)를 사용하여 요청 도메인에 따른 테넌트를 식별하는 미들웨어 구현.
  - [x] **데이터베이스 연동**:
    - [x] D1 데이터베이스 연결 유틸리티(`db.ts`) 생성.
    - [x] `tenants`, `admins`, `categories`, `articles`의 모든 CRUD API를 실제 D1 데이터베이스 쿼리 로직으로 **완전 대체**.

- [x] **`renderer`: 기본 구현**
  - [x] Hono 기반 프로젝트 초기화 및 Cloudflare Pages 배포 환경 설정.
  - [x] `cms-api` 연동을 위한 기본 Fetcher 로직 골격 구현.

## 기술 부채 및 해결이 필요한 이슈 (Technical Debt)

- [x] **데이터베이스 마이그레이션 자동화**
  - **현황**: `drizzle-kit` 설정 완료 및 D1 연동 체계 구축.
  - **해결**: `drizzle.config.ts`를 통해 스키마 변경 사항을 관리하고 `wrangler d1 migrations`를 활용하도록 개선.

- [ ] **보안 강화 (Security)**
  - **현황**: 비밀번호 해싱 및 JWT 리프레시 토큰 시스템 도입 완료. `wrangler secret`을 통한 키 관리 체계 수립.
  - **해결**: 정기적인 시크릿 로테이션 가이드 마련 및 토큰 탈취 대응 시나리오 구축 필요.

- [ ] **환경 변수 관리 최적화**
  - **현황**: `renderer` 및 `cms-api`에서 환경별 BASE_URL 및 API_URL 연동 구조 개선 완료.
  - **해결**: `wrangler.toml`의 `[vars]`를 통해 환경별 엔드포인트 관리 중.

## 배포 아키텍처 (Deployment Architecture)
- **API 서버 (Backend)**: Cloudflare Workers (`apps/cms-api`)
- **프론트엔드/렌더러 (Frontend)**: Cloudflare Pages (연동 및 배포 진행 중)

## 향후 로드맵 (Roadmap)

### Phase 1: 보안 및 인증 완성 (Done)
- [x] **실제 비밀번호 해싱 구현**: `Web Crypto API` 연동 완료.
- [x] **D1 스키마 정의**: `init.sql` 작성 완료. (실행 대기 중)
- [x] **로그인 API 구현**: `auth.ts` 내 비밀번호 검증 로직 추가 완료.
- [x] **환경 변수 설정**: `JWT_SECRET`, `PASSWORD_SALT` 설정 체계 마련.

### Phase 2: 콘텐츠 모델링 및 관계 고도화 (Done)
- [x] **다대다(Many-to-Many) 관계 구현**: 게시글-카테고리 매핑 API 로직 완료.
- [x] **콘텐츠 게시 워크플로우**: `isPublic` 상태에 따른 `publishedAt` 자동 설정 로직 적용.
- [x] **테넌트 격리 강화**: `admins`, `categories`, `articles` API 전반에 `tenantId` 필터링 적용.

### Phase 3: Renderer 연동 및 배포 최적화 (Done)
- [x] **Public API 엔드포인트**: Renderer가 인증 없이(테넌트 식별만으로) 접근 가능한 API 구축 완료.
- [x] **Renderer 캐싱 전략**: Cloudflare Cache API를 사용하여 Public API 응답 캐싱 적용 완료.

### Phase 4: 미디어 관리 및 관리자 UI (Done)
- [x] **R2 스토리지 연동**: `media.ts`를 통한 이미지 업로드 API 구현 완료.
- [x] **이미지 최적화**: 프론트엔드(Admin UI)에서 Canvas API를 이용한 WebP 변환 및 업로드 로직 구현 완료.
- [x] **Admin UI**: 로그인, 대시보드, 게시글 관리, 미디어 라이브러리 기능 구현 및 API 연동 완료.

### Phase 5: Renderer 완성 및 Pages 배포 (Done)
- [x] **Renderer 실구현**: `cms-api`의 Public API를 호출하여 테넌트별 블로그 메인 및 상세 페이지 구현 완료.
- [x] **SEO 최적화**: 게시글 상세 페이지 동적 메타 태그 생성 로직 추가.
- [x] **테넌트 커스텀 테마**: Cloudflare KV를 연동하여 테넌트별 색상 및 로고 적용 로직 구현.
- [x] **테넌트 설정 관리 API**: 테넌트 테마 및 도메인 설정을 D1에 저장하고 KV에 동기화하는 API 구현 완료 (도메인 변경 시 이전 매핑 삭제 로직 포함).
- [x] **Admin UI 설정 페이지**: 테넌트 설정을 변경할 수 있는 UI 구현 완료.
- [x] **Markdown 에디터**: 게시글 작성 시 EasyMDE를 통한 Markdown 편집 및 미리보기 기능 추가.
- [x] **게시글 수정 기능**: 기존 데이터를 불러와 에디터에 세팅하고 수정하는 기능 구현 완료.
- [x] **게시글 삭제 기능**: 목록 페이지에서 게시글을 삭제하는 기능 구현 완료.
- [x] **Markdown 렌더링**: Renderer에서 Markdown 본문을 HTML로 변환하여 출력하는 로직 추가.
- [x] **Pages 배포 설정**: Vite를 이용한 `_worker.js` 빌드 시스템 구축 및 배포 설정 완료.

### Phase 6: 성능 및 인프라 최적화 (Done)
- [x] **R2 이미지 리사이징**: Worker를 통한 동적 이미지 서빙 및 쿼리 기반 리사이징 로직 구현.
- [x] **LCP 최적화**: Renderer 목록 페이지에서 최적화된 크기의 썸네일을 불러오도록 개선.
- [x] **배포 환경 최적화**: Cloudflare Pages의 빌드 없는 배포(Root Directory 전략) 설정 완료.

## 수동 작업 체크리스트

- [ ] `git pull` 실행 (원격 저장소 동기화)
- [ ] `wrangler d1 execute bpr-db --file=./init.sql` (로컬/원격 DB 초기화)
- [ ] `wrangler secret put JWT_SECRET` (인증 키 설정)
- [ ] `wrangler secret put PASSWORD_SALT` (비밀번호 해싱용 솔트 설정)

### Phase 7: 유지보수 및 자동화 (In Progress)
- [x] **Drizzle Kit 설정**: 마이그레이션 자동화를 위한 `drizzle.config.ts` 구성 완료.
- [x] **Admin UI UX 고도화**: 토스트 메시지 알림 및 버튼 로딩 상태 구현 완료.
- [x] **시스템 모니터링 및 통계**: 글로벌 에러 핸들러 도입 및 대시보드 동적 통계 연동 완료.
- [x] **정적 자산 서빙**: Renderer 앱에서 `public` 폴더 내 자산(이미지, CSS 등) 서빙 설정 완료.
- [ ] **통합 테스트**: Cloudflare 배포 환경 기반 전체 워크플로우 검증 (진행 중).

## 배포 참고 사항 (Deployment Notes)

### Cloudflare 대시보드 설정 (Git 연동 시)

| 프로젝트명 | 유형 | Root Directory | Build Command | Output Directory |
| :--- | :--- | :--- | :--- | :--- |
| **pbr1** | Worker | `apps/cms-api` | (None) | (None) |
| **bprproto** | Pages | `apps/renderer` | `pnpm build` | `dist` |
| **bpr2** | Worker | `apps/renderer` | (None) | (None) |

### 주요 해결 과제
- **Pages 빌드 오류**: `dist` 디렉토리를 찾지 못하는 문제는 `pnpm build` 명령을 통해 Vite가 `_worker.js`를 생성하도록 하여 해결했습니다.
- **Lockfile 및 ESM 호환성 해결**: `@hono/vite-build` 버전 업데이트에 따른 ESM 설정(`type: module`) 및 임포트 경로 최적화 완료.
- **CORS 및 절대 경로**: `cms-api`에서 미디어 URL을 절대 경로로 반환하도록 수정하여 Pages 도메인에서도 이미지가 정상 출력됩니다.

### 수동 작업 (최초 1회)
1. Cloudflare 대시보드에서 `pbr1` Worker의 **Settings > Variables**에 `JWT_SECRET`과 `PASSWORD_SALT`를 추가하세요.
2. `bprproto` Pages의 **Settings > Builds & deployments**에서 빌드 명령을 `pnpm install --no-frozen-lockfile && pnpm build`로 수정하세요.
3. D1 데이터베이스에 테스트용 테넌트와 관리자 데이터를 Console에서 직접 입력하세요.

# 엔터프라이즈 정적 CMS 프로젝트 개발 현황 (2025-12-30, Phase 4 완료 및 테스트 준비)

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
  - [x] Hono 기반 프로젝트 초기화 및 Cloudflare Pages 배포 구조 설정.
  - [x] `cms-api` 연동을 위한 기본 Fetcher 로직 골격 구현.

## 기술 부채 및 해결이 필요한 이슈 (Technical Debt)

- [ ] **데이터베이스 마이그레이션 자동화**
  - **현황**: `drizzle-kit` 불안정으로 인해 `init.sql`을 통한 수동 관리 중.
  - **해결**: `drizzle-kit` 버전 업데이트 또는 Cloudflare 환경에 최적화된 마이그레이션 워크플로우 재설계 필요.

- [ ] **보안 강화 (Security)**
  - **현황**: `admins` 비밀번호 해싱 유틸리티(`crypto.ts`) 구현 및 API 적용 완료.
  - **해결**: `PASSWORD_SALT` 환경 변수 설정 필요.

- [ ] **환경 변수 관리 최적화**
  - **현황**: `renderer`의 `API_URL` 등이 하드코딩되어 있거나 관리가 미흡함.
  - **해결**: `wrangler.toml` 환경별 설정 분리 및 `secrets` 전환.

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

## 수동 작업 체크리스트

- [ ] `git pull` 실행 (원격 저장소 동기화)
- [ ] `wrangler d1 execute bpr-db --file=./init.sql` (로컬/원격 DB 초기화)
- [ ] `wrangler secret put JWT_SECRET` (인증 키 설정)
- [ ] `wrangler secret put PASSWORD_SALT` (비밀번호 해싱용 솔트 설정)

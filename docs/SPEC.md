# Enterprise Static CMS Technical Design Document



## 1. 프로젝트 개요 (Project Overview)

* **프로젝트명:** Enterprise Static CMS

* **목표:** 단일 코드베이스(Monorepo)와 서버리스 인프라(Cloudflare)를 사용하여 N개의 기업에게 독립적인 블로그/뉴스레터 페이지를 제공하는 엔터프라이즈급 멀티 테넌트 CMS 구축.

* **핵심 철학:** **Single Engine, Multi-Site**. 하나의 Worker 로직으로 수백 개의 커스텀 도메인을 동적으로 처리하며, 데이터 및 설정의 격리를 보장함.



## 2. 기술 스택 (Tech Stack)

* **Runtime:** [Cloudflare Workers](https://workers.cloudflare.com/) & [Cloudflare Pages](https://pages.cloudflare.com/)

* **Language:** [TypeScript](https://www.typescriptlang.org/)

* **Framework:** [Hono](https://hono.dev/) (Strict Mode) - 고성능 서버리스 웹 프레임워크

* **Database:** [Cloudflare D1](https://developers.cloudflare.com/d1/) (Edge-native RDBMS)

* **ORM:** [Drizzle ORM](https://orm.drizzle.team/)

* **Validation:** [Zod](https://zod.dev/)

* **Caching/Config:** [Cloudflare KV](https://developers.cloudflare.com/kv/) (도메인 화이트리스트 및 테넌트 메타데이터 캐싱)

* **Auth:** JWT (HS256) + **HttpOnly Cookie** 전략



## 3. 데이터베이스 스키마 설계 (Database Schema)

Drizzle ORM을 사용하여 구현할 관계형 스키마 구조입니다.



### 3.1. `tenants` (기업/테넌트)

테넌트의 기본 정보와 도메인 설정을 관리합니다.

* `id`: `text` (UUID, Primary Key)

* `name`: `text` (기업명)

* `slug`: `text` (고유 식별자, `unique`)

* `custom_domain`: `text` (커스텀 도메인, `unique`, 도메인 기반 식별용)

* `config`: `text` (JSON - 테마 컬러, 로고 URL, 소셜 링크 등)

* `created_at`: `integer` (Timestamp)

* `updated_at`: `integer` (Timestamp)



### 3.2. `admins` (관리자)

시스템 및 테넌트 관리자 계정입니다.

* `id`: `text` (UUID, Primary Key)

* `tenant_id`: `text` (Foreign Key -> `tenants.id`, NULL 허용 - NULL일 경우 슈퍼 어드민)

* `email`: `text` (이메일, `unique`)

* `password_hash`: `text` (Argon2 또는 BCrypt 해시)

* `role`: `text` (Enum: `SUPER_ADMIN`, `TENANT_ADMIN`, `EDITOR`)

* `created_at`: `integer`



### 3.3. `categories` (카테고리)

테넌트별로 독립적으로 관리되는 콘텐츠 분류입니다.

* `id`: `integer` (Primary Key, Auto Increment)

* `tenant_id`: `text` (Foreign Key -> `tenants.id`, Index 필수)

* `name`: `text` (카테고리명)

* `slug`: `text` (URL 경로용 식별자)



### 3.4. `articles` (게시글)

실제 콘텐츠 데이터입니다.

* `id`: `integer` (Primary Key, Auto Increment)

* `tenant_id`: `text` (Foreign Key -> `tenants.id`, Index 필수)

* `author_id`: `text` (Foreign Key -> `admins.id`)

* `post_type`: `text` (Default: `'BLOG'`, 예: `'PRESS'`, `'EVENT'`, `'NOTICE'`)

* `title`: `text`

* `content`: `text` (JSON or HTML/Markdown)

* `thumbnail_url`: `text`

* `seo_meta`: `text` (JSON - `title`, `description`, `og:image` 등)

* `is_public`: `integer` (Boolean - 0 또는 1)

* `published_at`: `integer` (Timestamp, 미래 시간 설정 시 예약 발행)

* `created_at`: `integer`

* `updated_at`: `integer`



### 3.5. `_article_categories` (다대다 관계)

글과 카테고리 간의 다대다 연결 테이블입니다.

* `article_id`: `integer` (Foreign Key -> `articles.id`)

* `category_id`: `integer` (Foreign Key -> `categories.id`)

* `PRIMARY KEY (article_id, category_id)`



## 4. 시스템 아키텍처 및 보안 (Security & Architecture)



### 4.1. 테넌트 식별 (Tenant Identification Strategy)

API Key 방식 대신 **Request Hostname**을 기반으로 테넌트를 식별합니다.

* **Middleware:** 모든 요청은 Host header를 검사하는 미들웨어를 통과함.

* **KV Lookup:** `domain:{hostname}` 키를 사용하여 `tenant_id`를 빠르게 조회.

    * Key: `domain:blog.example.com`

    * Value: `uuid-1234-5678`

* **Fallback:** 등록되지 않은 도메인 접근 시 404 또는 기본 랜딩 페이지로 유도.



### 4.2. 인증 및 보안 (Authentication & Security)

* **JWT Strategy:** JWT는 Access Token으로 사용되며, 서버 사이드 Secret Key(HS256)로 서명됨.

* **Cookie Policy:** XSS 공격 방지를 위해 Access Token은 `HttpOnly`, `Secure`, `SameSite=Strict` 쿠키에 저장.

* **Authorization:** 미들웨어에서 `tenant_id`와 JWT 내의 `tenant_id` 일치 여부를 검증하여 데이터 교차 접근 방지.



### 4.3. 디렉토리 구조 (Monorepo Layout)

```text

/

├── apps/

│   ├── cms-api/        # 관리자용 Hono API 서버 (Cloudflare Workers)

│   └── renderer/       # 사용자용 Public 렌더링 서버 (Cloudflare Pages/Workers)

├── packages/

│   └── shared/         # 공통 라이브러리

│       ├── db/         # Drizzle Schema & Migrations

│       ├── types/      # 공통 TypeScript Interfaces/Zod Schemas

│       └── utils/      # 공통 유틸리티 함수

├── docs/

│   └── SPEC.md         # 상세 기술 설계서

└── package.json

```



## 5. 인프라 운영 (Infrastructure)

* **Deployment:** GitHub Actions를 통한 Cloudflare Wrangler 배포 자동화.

* **Data Locality:** D1 및 KV를 활용하여 글로벌 엣지에서 낮은 레이턴시 제공.

* **Migration:** Drizzle-kit을 사용하여 D1 데이터베이스 스키마 마이그레이션 관리.


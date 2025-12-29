import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // 공유 패키지의 스키마 경로를 지정합니다.
  schema: '../../packages/shared/db/src/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    wranglerConfigPath: 'wrangler.toml',
    dbName: 'bpr-db',
  },
});
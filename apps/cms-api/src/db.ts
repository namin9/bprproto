import { DrizzleD1Database, drizzle } from 'drizzle-orm/d1';
import * as schema from '@bprproto/db/schema'; // 공유 스키마 임포트

export function getDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type Db = DrizzleD1Database<typeof schema>;

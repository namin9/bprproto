import type { Config } from "drizzle-kit";

export default {
  schema: "./schema.ts",
  out: "./migrations",
  dialect: "sqlite",
  driver: "d1",
  dbCredentials: {
    wranglerConfigPath: "../../apps/cms-api/wrangler.toml",
    dbName: "bpr-db",
  },
} satisfies Config;

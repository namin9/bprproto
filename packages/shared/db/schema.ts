import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const tenants = sqliteTable("tenants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  customDomain: text("custom_domain").notNull().unique(),
  config: text("config", { mode: "json" }),
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at")
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});

export const admins = sqliteTable("admins", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
});

export const articles = sqliteTable("articles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  authorId: text("author_id")
    .notNull()
    .references(() => admins.id),
  postType: text("post_type").notNull().default("BLOG"),
  title: text("title").notNull(),
  content: text("content"),
  thumbnailUrl: text("thumbnail_url"),
  seoMeta: text("seo_meta", { mode: "json" }),
  isPublic: integer("is_public").notNull().default(0),
  publishedAt: integer("published_at"),
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at")
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});

export const articleCategories = sqliteTable("_article_categories", {
  articleId: integer("article_id")
    .notNull()
    .references(() => articles.id),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
});

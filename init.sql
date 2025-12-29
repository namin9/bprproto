CREATE TABLE tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    custom_domain TEXT NOT NULL UNIQUE,
    config TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE admins (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    post_type TEXT NOT NULL DEFAULT 'BLOG',
    title TEXT NOT NULL,
    content TEXT,
    thumbnail_url TEXT,
    seo_meta TEXT,
    is_public INTEGER NOT NULL DEFAULT 0,
    published_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (author_id) REFERENCES admins(id)
);

CREATE TABLE _article_categories (
    article_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    PRIMARY KEY (article_id, category_id),
    FOREIGN KEY (article_id) REFERENCES articles(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

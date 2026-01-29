import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uuid,
  index,
} from "drizzle-orm/pg-core";

// Sources table - defines data sources to monitor
export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    type: text("type").notNull(), // 'rss' | 'html' | 'api'
    url: text("url").notNull(),
    category: text("category").notNull(), // 'grants' | 'protocol' | 'governance' | 'ecosystem'
    extractor: text("extractor"), // custom extractor identifier
    enabled: boolean("enabled").default(true).notNull(),
    lastFetchedAt: timestamp("last_fetched_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("sources_category_idx").on(table.category),
    index("sources_enabled_idx").on(table.enabled),
  ]
);

// Snapshots table - stores raw content fetched from sources
export const snapshots = pgTable(
  "snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .references(() => sources.id, { onDelete: "cascade" })
      .notNull(),
    contentHash: text("content_hash").notNull(),
    rawContent: text("raw_content").notNull(),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  },
  (table) => [
    index("snapshots_source_id_idx").on(table.sourceId),
    index("snapshots_fetched_at_idx").on(table.fetchedAt),
  ]
);

// Diffs table - stores differences between consecutive snapshots
export const diffs = pgTable(
  "diffs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    snapshotId: uuid("snapshot_id")
      .references(() => snapshots.id, { onDelete: "cascade" })
      .notNull(),
    prevSnapshotId: uuid("prev_snapshot_id").references(() => snapshots.id, {
      onDelete: "set null",
    }),
    patch: text("patch").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("diffs_snapshot_id_idx").on(table.snapshotId),
    index("diffs_created_at_idx").on(table.createdAt),
  ]
);

// Digests table - summarized/processed diffs for user consumption
export const digests = pgTable(
  "digests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    diffId: uuid("diff_id")
      .references(() => diffs.id, { onDelete: "cascade" })
      .notNull(),
    sourceId: uuid("source_id")
      .references(() => sources.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    bullets: jsonb("bullets").$type<string[]>().notNull(),
    action: text("action"), // recommended action
    deadline: timestamp("deadline"), // if applicable
    tags: jsonb("tags").$type<string[]>().default([]).notNull(),
    score: integer("score").default(0).notNull(), // importance score 0-100
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("digests_source_id_idx").on(table.sourceId),
    index("digests_score_idx").on(table.score),
    index("digests_created_at_idx").on(table.createdAt),
  ]
);

// Watchlist table - user subscriptions to sources
export const watchlist = pgTable(
  "watchlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fid: text("fid").notNull(), // Farcaster ID
    sourceId: uuid("source_id")
      .references(() => sources.id, { onDelete: "cascade" })
      .notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("watchlist_fid_idx").on(table.fid),
    index("watchlist_source_id_idx").on(table.sourceId),
    index("watchlist_fid_source_idx").on(table.fid, table.sourceId),
  ]
);

// Notification tokens table - stores user notification tokens
export const notificationTokens = pgTable(
  "notification_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fid: text("fid").notNull(),
    appFid: text("app_fid").notNull(),
    token: text("token").notNull(),
    url: text("url").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("notification_tokens_fid_idx").on(table.fid),
    index("notification_tokens_active_idx").on(table.active),
  ]
);

// Jobs table - background job queue
export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(), // 'fetch' | 'process' | 'notify'
    payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
    status: text("status").default("pending").notNull(), // 'pending' | 'processing' | 'completed' | 'failed'
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("jobs_type_idx").on(table.type),
    index("jobs_status_idx").on(table.status),
    index("jobs_created_at_idx").on(table.createdAt),
  ]
);

// Type exports
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type Snapshot = typeof snapshots.$inferSelect;
export type NewSnapshot = typeof snapshots.$inferInsert;
export type Diff = typeof diffs.$inferSelect;
export type NewDiff = typeof diffs.$inferInsert;
export type Digest = typeof digests.$inferSelect;
export type NewDigest = typeof digests.$inferInsert;
export type Watchlist = typeof watchlist.$inferSelect;
export type NewWatchlist = typeof watchlist.$inferInsert;
export type NotificationToken = typeof notificationTokens.$inferSelect;
export type NewNotificationToken = typeof notificationTokens.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;

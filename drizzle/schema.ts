import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * SISREG credentials configuration - stored per user
 * Credentials are encrypted before storage
 */
export const sisregConfig = mysqlTable("sisreg_config", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  baseUrl: varchar("baseUrl", { length: 512 }).notNull().default("https://sisreg-es.saude.gov.br"),
  username: varchar("username", { length: 256 }).notNull(),
  encryptedPassword: text("encryptedPassword").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SisregConfig = typeof sisregConfig.$inferSelect;
export type InsertSisregConfig = typeof sisregConfig.$inferInsert;

/**
 * Query logs for audit purposes (no credentials stored)
 */
export const queryLogs = mysqlTable("query_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  indexType: varchar("indexType", { length: 32 }).notNull().default("marcacao"),
  queryMode: varchar("queryMode", { length: 32 }).notNull(),
  dateStart: varchar("dateStart", { length: 32 }),
  dateEnd: varchar("dateEnd", { length: 32 }),
  size: int("size").notNull(),
  from: int("fromOffset").default(0),
  totalHits: int("totalHits"),
  httpStatus: int("httpStatus"),
  took: int("took"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QueryLog = typeof queryLogs.$inferSelect;
export type InsertQueryLog = typeof queryLogs.$inferInsert;

/**
 * Saved field selections per user
 */
export const fieldSelections = mysqlTable("field_selections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  fields: json("fields").notNull(),
  isDefault: int("isDefault").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FieldSelection = typeof fieldSelections.$inferSelect;
export type InsertFieldSelection = typeof fieldSelections.$inferInsert;

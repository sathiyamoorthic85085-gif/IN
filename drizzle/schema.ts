import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
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

export const registrations = mysqlTable("registrations", {
  id: int("id").autoincrement().primaryKey(),
  referenceCode: varchar("referenceCode", { length: 32 }).notNull().unique(),
  teamName: varchar("teamName", { length: 120 }).notNull(),
  leadName: varchar("leadName", { length: 120 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 24 }).notNull(),
  college: varchar("college", { length: 180 }).notNull(),
  memberOne: varchar("memberOne", { length: 120 }).notNull(),
  memberTwo: varchar("memberTwo", { length: 120 }).notNull(),
  memberThree: varchar("memberThree", { length: 120 }),
  memberFour: varchar("memberFour", { length: 120 }),
  memberFive: varchar("memberFive", { length: 120 }),
  memberSix: varchar("memberSix", { length: 120 }),
  memberCount: int("memberCount").notNull(),
  domain: varchar("domain", { length: 96 }).notNull(),
  buildType: mysqlEnum("buildType", ["software", "hardware"]).notNull(),
  transactionId: varchar("transactionId", { length: 128 }).notNull().unique(),
  paymentStatus: mysqlEnum("paymentStatus", ["payment_pending", "verified", "rejected"]).default("payment_pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Registration = typeof registrations.$inferSelect;
export type InsertRegistration = typeof registrations.$inferInsert;

const secureRegistrationColumns = () => ({
  id: int("id").autoincrement().primaryKey(),
  referenceCode: varchar("referenceCode", { length: 32 }).notNull().unique(),
  teamNameCipher: varchar("teamNameCipher", { length: 1024 }).notNull(),
  leadNameCipher: varchar("leadNameCipher", { length: 1024 }).notNull(),
  emailCipher: varchar("emailCipher", { length: 1024 }).notNull(),
  phoneCipher: varchar("phoneCipher", { length: 1024 }).notNull(),
  collegeCipher: varchar("collegeCipher", { length: 1024 }).notNull(),
  memberOneCipher: varchar("memberOneCipher", { length: 1024 }).notNull(),
  memberTwoCipher: varchar("memberTwoCipher", { length: 1024 }),
  memberThreeCipher: varchar("memberThreeCipher", { length: 1024 }),
  memberFourCipher: varchar("memberFourCipher", { length: 1024 }),
  memberFiveCipher: varchar("memberFiveCipher", { length: 1024 }),
  memberSixCipher: varchar("memberSixCipher", { length: 1024 }),
  memberCount: int("memberCount").notNull(),
  domain: varchar("domain", { length: 96 }).notNull(),
  transactionCipher: varchar("transactionCipher", { length: 1024 }).notNull(),
  transactionFingerprint: varchar("transactionFingerprint", { length: 64 }).notNull().unique(),
  paymentStatus: mysqlEnum("paymentStatus", ["payment_pending", "verified", "rejected"]).default("payment_pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const softwareRegistrations = mysqlTable("software_registrations", secureRegistrationColumns());
export const hardwareRegistrations = mysqlTable("hardware_registrations", secureRegistrationColumns());

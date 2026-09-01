import { desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { hardwareRegistrations, softwareRegistrations, InsertUser, users } from "../drizzle/schema";
import { decryptRegistrationValue, encryptRegistrationValue, transactionFingerprint, transactionFingerprints } from "./registrationCrypto";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (process.env.OWNER_OPEN_ID && user.openId === process.env.OWNER_OPEN_ID) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export type SecureRegistrationInput = {
  referenceCode: string;
  teamName: string;
  leadName: string;
  email: string;
  phone: string;
  college: string;
  memberOne: string;
  memberTwo?: string;
  memberThree?: string;
  memberFour?: string;
  memberFive?: string;
  memberSix?: string;
  memberCount: number;
  domain: string;
  buildType: "software" | "hardware";
  transactionId: string;
};

const decodeRegistration = (row: typeof softwareRegistrations.$inferSelect, buildType: "software" | "hardware") => ({
  referenceCode: row.referenceCode,
  teamName: decryptRegistrationValue(row.teamNameCipher),
  leadName: decryptRegistrationValue(row.leadNameCipher),
  email: decryptRegistrationValue(row.emailCipher),
  phone: decryptRegistrationValue(row.phoneCipher),
  college: decryptRegistrationValue(row.collegeCipher),
  memberOne: decryptRegistrationValue(row.memberOneCipher),
  memberTwo: row.memberTwoCipher ? decryptRegistrationValue(row.memberTwoCipher) : null,
  memberThree: row.memberThreeCipher ? decryptRegistrationValue(row.memberThreeCipher) : null,
  memberFour: row.memberFourCipher ? decryptRegistrationValue(row.memberFourCipher) : null,
  memberFive: row.memberFiveCipher ? decryptRegistrationValue(row.memberFiveCipher) : null,
  memberSix: row.memberSixCipher ? decryptRegistrationValue(row.memberSixCipher) : null,
  memberCount: row.memberCount,
  domain: row.domain,
  buildType,
  transactionId: decryptRegistrationValue(row.transactionCipher),
  paymentStatus: row.paymentStatus,
  createdAt: row.createdAt,
});

export async function createSecureRegistration(registration: SecureRegistrationInput) {
  const db = await getDb();
  if (!db) throw new Error("Registration storage is unavailable");

  const values = {
    referenceCode: registration.referenceCode,
    teamNameCipher: encryptRegistrationValue(registration.teamName),
    leadNameCipher: encryptRegistrationValue(registration.leadName),
    emailCipher: encryptRegistrationValue(registration.email),
    phoneCipher: encryptRegistrationValue(registration.phone),
    collegeCipher: encryptRegistrationValue(registration.college),
    memberOneCipher: encryptRegistrationValue(registration.memberOne),
    memberTwoCipher: registration.memberTwo ? encryptRegistrationValue(registration.memberTwo) : null,
    memberThreeCipher: registration.memberThree ? encryptRegistrationValue(registration.memberThree) : null,
    memberFourCipher: registration.memberFour ? encryptRegistrationValue(registration.memberFour) : null,
    memberFiveCipher: registration.memberFive ? encryptRegistrationValue(registration.memberFive) : null,
    memberSixCipher: registration.memberSix ? encryptRegistrationValue(registration.memberSix) : null,
    memberCount: registration.memberCount,
    domain: registration.domain,
    transactionCipher: encryptRegistrationValue(registration.transactionId),
    transactionFingerprint: transactionFingerprint(registration.transactionId),
    paymentStatus: "payment_pending" as const,
  };
  if (registration.buildType === "software") await db.insert(softwareRegistrations).values(values);
  else await db.insert(hardwareRegistrations).values(values);
}

export async function transactionAlreadyUsed(transactionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Registration storage is unavailable");
  const fingerprints = transactionFingerprints(transactionId);
  const result = await db.select({ id: softwareRegistrations.id }).from(softwareRegistrations).where(inArray(softwareRegistrations.transactionFingerprint, fingerprints)).limit(1);
  if (result.length) return true;
  const hardwareResult = await db.select({ id: hardwareRegistrations.id }).from(hardwareRegistrations).where(inArray(hardwareRegistrations.transactionFingerprint, fingerprints)).limit(1);
  return hardwareResult.length > 0;
}

export async function getSecureRegistrationsByBuildType(buildType: "software" | "hardware") {
  const db = await getDb();
  if (!db) throw new Error("Registration storage is unavailable");
  if (buildType === "software") return (await db.select().from(softwareRegistrations).orderBy(desc(softwareRegistrations.createdAt))).map((row) => decodeRegistration(row, "software"));
  return (await db.select().from(hardwareRegistrations).orderBy(desc(hardwareRegistrations.createdAt))).map((row) => decodeRegistration(row, "hardware"));
}

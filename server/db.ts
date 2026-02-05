import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  sisregConfig, 
  InsertSisregConfig,
  queryLogs,
  InsertQueryLog,
  fieldSelections,
  InsertFieldSelection,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import crypto from 'crypto';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance
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

// ============ User Functions ============

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
    } else if (user.openId === ENV.ownerOpenId) {
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

// ============ Encryption Helpers ============

const ENCRYPTION_KEY = process.env.JWT_SECRET || 'default-key-for-dev';

function getEncryptionKey(): Buffer {
  // Use first 32 bytes of JWT_SECRET as encryption key
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
}

export function encryptPassword(password: string): string {
  const iv = crypto.randomBytes(16);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decryptPassword(encryptedPassword: string): string {
  const [ivHex, encrypted] = encryptedPassword.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ============ SISREG Config Functions ============

export async function getSisregConfig(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(sisregConfig)
    .where(eq(sisregConfig.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function upsertSisregConfig(
  userId: number,
  config: { baseUrl: string; username: string; password: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const encryptedPassword = encryptPassword(config.password);
  
  const existing = await getSisregConfig(userId);
  
  if (existing) {
    await db
      .update(sisregConfig)
      .set({
        baseUrl: config.baseUrl,
        username: config.username,
        encryptedPassword,
      })
      .where(eq(sisregConfig.userId, userId));
  } else {
    await db.insert(sisregConfig).values({
      userId,
      baseUrl: config.baseUrl,
      username: config.username,
      encryptedPassword,
    });
  }
}

export async function deleteSisregConfig(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(sisregConfig).where(eq(sisregConfig.userId, userId));
}

// ============ Query Log Functions ============

export async function createQueryLog(log: InsertQueryLog) {
  const db = await getDb();
  if (!db) return;

  await db.insert(queryLogs).values(log);
}

export async function getQueryLogs(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(queryLogs)
    .where(eq(queryLogs.userId, userId))
    .orderBy(desc(queryLogs.createdAt))
    .limit(limit);
}

// ============ Field Selection Functions ============

export async function getFieldSelections(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(fieldSelections)
    .where(eq(fieldSelections.userId, userId))
    .orderBy(desc(fieldSelections.updatedAt));
}

export async function createFieldSelection(selection: InsertFieldSelection) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(fieldSelections).values(selection);
}

export async function updateFieldSelection(id: number, userId: number, data: { name?: string; fields?: string[]; isDefault?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(fieldSelections)
    .set(data)
    .where(eq(fieldSelections.id, id));
}

export async function deleteFieldSelection(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(fieldSelections).where(eq(fieldSelections.id, id));
}

import { randomUUID } from "node:crypto";
import pg from "pg";
const { Pool } = pg;
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const now = () => new Date().toISOString();
const DEFAULT_QUOTA_BYTES = Number(process.env.DEFAULT_QUOTA_BYTES || 524288000); // 500 MB default (Supabase free tier cap)

// Convert camelCase keys to snake_case for PostgreSQL columns
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

// Convert snake_case keys to camelCase for JS objects
function snakeToCamel(str) {
  return str.replace(/([-_][a-z])/g, (group) =>
    group.toUpperCase().replace("-", "").replace("_", "")
  );
}

function toSnakeCase(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (obj instanceof Date) return obj;
  const result = {};
  for (const key of Object.keys(obj)) {
    const snakeKey = camelToSnake(key);
    let val = obj[key];
    if (val && typeof val === "object" && !(val instanceof Date) && key !== "providers" && key !== "notifications" && key !== "context") {
      val = toSnakeCase(val);
    }
    result[snakeKey] = val;
  }
  return result;
}

function toCamelCase(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  const result = {};
  for (const key of Object.keys(obj)) {
    const camelKey = snakeToCamel(key);
    let val = obj[key];
    if (val && typeof val === "object" && !(val instanceof Date) && key !== "providers" && key !== "notifications" && key !== "context") {
      val = toCamelCase(val);
    }
    result[camelKey] = val;
  }
  return result;
}

export function createMemoryStore() {
  const users = [];
  const folders = [];
  const files = [];
  const versions = [];
  const shares = [];
  const links = [];
  const stars = [];
  const activities = [];
  const refresh = new Map();
  const sessions = [];
  const settings = [];
  const notifications = [];

  function getOrCreateSettings(userId) {
    let s = settings.find((x) => x.userId === userId);
    if (!s) {
      s = {
        userId,
        plan: "free",
        notifications: { email: true, share: true, security: true },
        updatedAt: now(),
      };
      settings.push(s);
    }
    return s;
  }

  function storageUsed(userId) {
    return files
      .filter((f) => f.ownerId === userId && !f.isDeleted)
      .reduce((sum, f) => sum + Number(f.sizeBytes || 0), 0);
  }

  function quotaFor(userId) {
    const u = users.find((x) => x.id === userId);
    return Number(u?.quotaBytes ?? DEFAULT_QUOTA_BYTES);
  }

  return {
    users,
    folders,
    files,
    versions,
    shares,
    links,
    stars,
    activities,
    refresh,
    sessions,
    settings,
    notifications,
    id: () => randomUUID(),
    now,
    getOrCreateSettings,
    storageUsed,
    quotaFor,
    DEFAULT_QUOTA_BYTES,
  };
}

export const mem = createMemoryStore();

// Setup PostgreSQL pool if DATABASE_URL is configured
export let pool = null;
let isInitialLoad = false;

if (process.env.DATABASE_URL) {
  console.log("DATABASE_URL is set. Initializing PostgreSQL pool...");
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Supabase / hosted PG databases
  });

  // DB Insert helper
  async function dbInsert(tableName, item) {
    const snakeItem = toSnakeCase(item);
    const keys = Object.keys(snakeItem);
    const values = Object.values(snakeItem);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    
    let conflictClause = "";
    if (tableName === "stars") {
      conflictClause = "ON CONFLICT (user_id, resource_type, resource_id) DO NOTHING";
    } else if (tableName === "user_settings") {
      conflictClause = "ON CONFLICT (user_id) DO NOTHING";
    } else {
      conflictClause = "ON CONFLICT (id) DO NOTHING";
    }

    const query = `
      INSERT INTO ${tableName} (${keys.join(", ")})
      VALUES (${placeholders})
      ${conflictClause}
    `;
    try {
      await pool.query(query, values);
    } catch (err) {
      console.error(`DB INSERT error on ${tableName}:`, err);
    }
  }

  // DB Update helper
  async function dbUpdate(tableName, pkInfo, item, prop, value) {
    const snakeProp = camelToSnake(prop);
    const snakeVal = toSnakeCase(value);
    
    let query;
    let values;
    if (Array.isArray(pkInfo)) {
      const clauses = pkInfo.map((k, i) => `${k} = $${i + 2}`).join(" AND ");
      query = `UPDATE ${tableName} SET ${snakeProp} = $1 WHERE ${clauses}`;
      values = [snakeVal, ...pkInfo.map((k) => toSnakeCase(item[snakeToCamel(k)]))];
    } else {
      query = `UPDATE ${tableName} SET ${snakeProp} = $1 WHERE ${pkInfo} = $2`;
      values = [snakeVal, toSnakeCase(item[snakeToCamel(pkInfo)])];
    }

    try {
      await pool.query(query, values);
    } catch (err) {
      console.error(`DB UPDATE error on ${tableName} for prop ${prop}:`, err);
    }
  }

  // DB Delete helper
  async function dbDelete(tableName, pkInfo, item) {
    let query;
    let values;
    if (Array.isArray(pkInfo)) {
      const clauses = pkInfo.map((k, i) => `${k} = $${i + 1}`).join(" AND ");
      query = `DELETE FROM ${tableName} WHERE ${clauses}`;
      values = pkInfo.map((k) => toSnakeCase(item[snakeToCamel(k)]));
    } else {
      query = `DELETE FROM ${tableName} WHERE ${pkInfo} = $1`;
      values = [toSnakeCase(item[snakeToCamel(pkInfo)])];
    }

    try {
      await pool.query(query, values);
    } catch (err) {
      console.error(`DB DELETE error on ${tableName}:`, err);
    }
  }

  // Object property proxy tracking updates
  function makePersistedObject(obj, tableName, pkInfo) {
    return new Proxy(obj, {
      set(target, prop, value, receiver) {
        const oldVal = target[prop];
        const success = Reflect.set(target, prop, value, receiver);
        if (success && oldVal !== value && typeof prop === "string") {
          dbUpdate(tableName, pkInfo, target, prop, value);
        }
        return success;
      },
    });
  }

  // Array push and splice tracking mutations
  function makePersistedArray(array, tableName, pkInfo) {
    const originalPush = array.push;
    array.push = function (...items) {
      for (const item of items) {
        if (!isInitialLoad) {
          dbInsert(tableName, item);
        }
        const proxiedItem = makePersistedObject(item, tableName, pkInfo);
        originalPush.call(this, proxiedItem);
      }
      return this.length;
    };

    const originalSplice = array.splice;
    array.splice = function (start, deleteCount, ...items) {
      const deletedItems = this.slice(start, start + deleteCount);
      for (const item of deletedItems) {
        dbDelete(tableName, pkInfo, item);
      }
      
      const wrappedItems = items.map((item) => {
        if (!isInitialLoad) {
          dbInsert(tableName, item);
        }
        return makePersistedObject(item, tableName, pkInfo);
      });

      return originalSplice.call(this, start, deleteCount, ...wrappedItems);
    };

    return array;
  }

  // Map set and delete tracking refresh tokens
  function makePersistedMap(map) {
    const originalSet = map.set;
    map.set = function (key, value) {
      const result = originalSet.call(this, key, value);
      if (!isInitialLoad) {
        pool.query(
          "INSERT INTO refresh_tokens (token, user_id, jti) VALUES ($1, $2, $3) ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, jti = EXCLUDED.jti",
          [key, value.userId, value.jti]
        ).catch((err) => console.error("DB Map set error:", err));
      }
      return result;
    };

    const originalDelete = map.delete;
    map.delete = function (key) {
      const result = originalDelete.call(this, key);
      pool.query("DELETE FROM refresh_tokens WHERE token = $1", [key])
        .catch((err) => console.error("DB Map delete error:", err));
      return result;
    };

    return map;
  }

  // Connect database, apply schema, and load existing records
  async function connectAndSync() {
    isInitialLoad = true;
    try {
      // 1. Load schema.sql to create tables if not exists
      const schemaPath = path.join(__dirname, "../sql/schema.sql");
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, "utf8");
        // Remove 'create extension' line if it fails due to permissions on hosted DB
        try {
          await pool.query(schemaSql);
          console.log("PostgreSQL database schema synchronized successfully.");
        } catch (schemaErr) {
          console.warn("PostgreSQL schema execution warning, trying table by table...", schemaErr.message);
          // Split queries by semicolon and try executing individually
          const queries = schemaSql.split(";").map(q => q.trim()).filter(Boolean);
          for (const q of queries) {
            try {
              await pool.query(q);
            } catch (qErr) {
              if (!q.toLowerCase().includes("extension")) {
                console.error("Failed executing query:", q, qErr.message);
              }
            }
          }
        }
      }

      // 2. Create custom refresh_tokens table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          token TEXT PRIMARY KEY,
          user_id UUID,
          jti TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Ensure file_data bytea column exists in file_versions for database storage
      await pool.query("ALTER TABLE file_versions ADD COLUMN IF NOT EXISTS file_data bytea");

      // Update all users' default quota to 500 MB (524288000 bytes) to match Supabase database tier capacity
      await pool.query("UPDATE users SET quota_bytes = 524288000");

      // 3. Load records from DB into local cache
      const tables = [
        { key: "users", name: "users", pk: "id" },
        { key: "folders", name: "folders", pk: "id" },
        { key: "files", name: "files", pk: "id" },
        { key: "versions", name: "file_versions", pk: "id" },
        { key: "shares", name: "shares", pk: "id" },
        { key: "links", name: "link_shares", pk: "id" },
        { key: "stars", name: "stars", pk: ["user_id", "resource_type", "resource_id"] },
        { key: "activities", name: "activities", pk: "id" },
        { key: "sessions", name: "sessions", pk: "id" },
        { key: "settings", name: "user_settings", pk: "user_id" },
        { key: "notifications", name: "notifications", pk: "id" }
      ];

      for (const t of tables) {
        const res = await pool.query(`SELECT * FROM ${t.name}`);
        for (const row of res.rows) {
          const item = toCamelCase(row);
          const proxiedItem = makePersistedObject(item, t.name, t.pk);
          mem[t.key].push(proxiedItem);
        }
        console.log(`Loaded ${res.rowCount} records into mem.${t.key}`);
      }

      // Load refresh tokens Map
      const refreshRes = await pool.query("SELECT * FROM refresh_tokens");
      for (const row of refreshRes.rows) {
        mem.refresh.set(row.token, { userId: row.user_id, jti: row.jti });
      }
      console.log(`Loaded ${refreshRes.rowCount} refresh tokens`);

    } catch (err) {
      console.error("Database connection/load error:", err);
    } finally {
      isInitialLoad = false;
    }

    // Now decorate all the arrays to persist future changes
    makePersistedArray(mem.users, "users", "id");
    makePersistedArray(mem.folders, "folders", "id");
    makePersistedArray(mem.files, "files", "id");
    makePersistedArray(mem.versions, "file_versions", "id");
    makePersistedArray(mem.shares, "shares", "id");
    makePersistedArray(mem.links, "link_shares", "id");
    makePersistedArray(mem.stars, "stars", ["user_id", "resource_type", "resource_id"]);
    makePersistedArray(mem.activities, "activities", "id");
    makePersistedArray(mem.sessions, "sessions", "id");
    makePersistedArray(mem.settings, "user_settings", "user_id");
    makePersistedArray(mem.notifications, "notifications", "id");
    makePersistedMap(mem.refresh);
    
    console.log("Database persistent synchronization layer attached to MemoryStore.");
  }

  // Trigger async db synchronization
  connectAndSync();
}

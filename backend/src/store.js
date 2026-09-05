import { randomUUID } from "node:crypto";
import pg from "pg";
const { Pool } = pg;
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const now = () => new Date().toISOString();
const DEFAULT_QUOTA_BYTES = Number(process.env.DEFAULT_QUOTA_BYTES || 524288000); // 500 MB default (Supabase free tier cap)

// Declare module-level state at the top to prevent TDZ issues when bundled by esbuild
export let pool = null;
let isInitialLoad = false;
const _state = { ready: null };

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
  if (obj === null || obj === undefined || typeof obj !== "object") return obj;
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
  if (obj === null || obj === undefined || typeof obj !== "object") return obj;
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
    findUser: async (id, googleSub, email) => {
      let u = users.find((x) => 
        (id && x.id === id) || 
        (googleSub && x.providers?.google?.sub === googleSub) ||
        (email && x.email?.toLowerCase() === email.toLowerCase())
      );
      if (u) return u;
      if (pool) {
        let query = "SELECT * FROM users WHERE id = $1";
        let params = [id];
        
        if (googleSub) {
          query = "SELECT * FROM users WHERE providers->'google'->>'sub' = $1";
          params = [googleSub];
        } else if (email) {
          query = "SELECT * FROM users WHERE email = $1";
          params = [email.toLowerCase()];
        }
        
        const res = await pool.query(query, params);
        if (res.rows[0]) {
          const item = toCamelCase(res.rows[0]);
          const proxied = makePersistedObject(item, "users", "id");
          users.push(proxied);
          return proxied;
        }
      }
      return null;
    },
    findSession: async (userId, jti) => {
      let s = sessions.find((x) => (jti ? x.id === jti : x.userId === userId) && !x.revokedAt);
      if (s) return s;
      if (pool) {
        const query = jti 
          ? "SELECT * FROM sessions WHERE id = $1 AND revoked_at IS NULL LIMIT 1"
          : "SELECT * FROM sessions WHERE user_id = $1 AND revoked_at IS NULL ORDER BY last_active_at DESC LIMIT 1";
        const params = jti ? [jti] : [userId];
        const res = await pool.query(query, params);
        if (res.rows[0]) {
          const item = toCamelCase(res.rows[0]);
          const proxied = makePersistedObject(item, "sessions", "id");
          sessions.push(proxied);
          return proxied;
        }
      }
      return null;
    },
    findFile: async (id) => {
      let f = files.find((x) => x.id === id);
      if (f) return f;
      if (pool) {
        const res = await pool.query("SELECT * FROM files WHERE id = $1", [id]);
        if (res.rows[0]) {
          const item = toCamelCase(res.rows[0]);
          const proxied = makePersistedObject(item, "files", "id");
          files.push(proxied);
          return proxied;
        }
      }
      return null;
    },
    findFolder: async (id) => {
      let f = folders.find((x) => x.id === id);
      if (f) return f;
      if (pool) {
        const res = await pool.query("SELECT * FROM folders WHERE id = $1", [id]);
        if (res.rows[0]) {
          const item = toCamelCase(res.rows[0]);
          const proxied = makePersistedObject(item, "folders", "id");
          folders.push(proxied);
          return proxied;
        }
      }
      return null;
    }
  };
}

export const mem = createMemoryStore();

// Setup PostgreSQL pool if DATABASE_URL is configured
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
      if (!pool) return;

      // 1. Ensure database schema and critical tables exist
      try {
        const schemaPath = path.join(__dirname, "../sql/schema.sql");
        if (fs.existsSync(schemaPath)) {
          const schemaSql = fs.readFileSync(schemaPath, "utf8");
          await pool.query(schemaSql);
          console.log("PostgreSQL schema synchronized.");
        }
      } catch (schemaErr) {
        console.warn("Schema sync skipped/failed:", schemaErr.message);
      }

      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS refresh_tokens (
            token TEXT PRIMARY KEY,
            user_id UUID,
            jti TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
          )
        `);
      } catch (e) {
        console.warn("Table check failed:", e.message);
      }

      try {
        await pool.query("ALTER TABLE file_versions ADD COLUMN IF NOT EXISTS file_data bytea");
      } catch (e) {
        console.warn("Column check failed:", e.message);
      }

      // 2. Load records from DB into local cache
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
        try {
          const query = t.name === "file_versions" 
            ? "SELECT id, file_id, version_number, storage_key, size_bytes, checksum, created_at FROM file_versions"
            : `SELECT * FROM ${t.name}`;
            
          const res = await pool.query(query);
          for (const row of res.rows) {
            const item = toCamelCase(row);
            const proxiedItem = makePersistedObject(item, t.name, t.pk);
            mem[t.key].push(proxiedItem);
          }
          console.log(`Loaded ${res.rowCount} records into mem.${t.key}`);
        } catch (tableErr) {
          console.warn(`Table ${t.name} query failed:`, tableErr.message);
        }
      }

      // Load refresh tokens Map
      try {
        const refreshRes = await pool.query("SELECT * FROM refresh_tokens");
        for (const row of refreshRes.rows) {
          mem.refresh.set(row.token, { userId: row.user_id, jti: row.jti });
        }
        console.log(`Loaded ${refreshRes.rowCount} refresh tokens`);
      } catch (refreshErr) {
        console.warn("Refresh tokens load failed:", refreshErr.message);
      }

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
  _state.ready = connectAndSync();
}

export function ensureStoreReady() {
  return _state.ready || Promise.resolve();
}

import { Router } from "express";
import path from "node:path";
import crypto from "node:crypto";
import { z } from "zod";
import { mem, pool } from "../store.js";
import { camelFile, fail, sanitizeFilename, signedUrlToken, slugName, verifySignedUrlToken } from "../util.js";
import { requireAuth } from "../auth.js";
import { assertRead, assertWrite, getFile, logActivity } from "../acl.js";

export const filesRouter = Router();

const initSchema = z.object({
  name: z.string().min(1).max(220),
  mimeType: z.string().min(1).max(180),
  sizeBytes: z.number().int().nonnegative().max(1024 * 1024 * 1024 * 5), // 5 GB cap per file
  folderId: z.string().uuid().nullable().optional(),
  checksum: z.string().max(128).optional(),
});

const completeSchema = z.object({
  fileId: z.string().uuid(),
  parts: z.array(z.object({ partNumber: z.number(), etag: z.string() })).optional(),
  checksum: z.string().max(128).optional(),
});

const patchSchema = z.object({
  name: z.string().min(1).max(220).optional(),
  folderId: z.string().uuid().nullable().optional(),
});

const bulkSchema = z.object({
  ids: z.array(z.string()).min(1).max(500),
  action: z.enum(["delete", "move", "star", "unstar"]),
  destinationId: z.string().uuid().nullable().optional(),
});

function enforceQuota(userId, additionalBytes) {
  const used = mem.storageUsed(userId);
  const quota = mem.quotaFor(userId);
  if (used + additionalBytes > quota) {
    throw fail(413, "QUOTA_EXCEEDED", `Storage quota exceeded (${used + additionalBytes} > ${quota})`);
  }
}

filesRouter.post("/init", requireAuth, async (req, res, next) => {
  try {
    const body = initSchema.parse(req.body);
    if (body.folderId) await assertWrite(req.user.id, "folder", body.folderId);
    enforceQuota(req.user.id, body.sizeBytes);
    const fileId = mem.id();
    const ext = path.extname(body.name);
    const storageKey = `tenants/${req.user.id}/folders/${body.folderId ?? "root"}/files/${fileId}-${slugName(body.name)}${ext}`;
    const file = {
      id: fileId,
      name: sanitizeFilename(body.name),
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      storageKey,
      ownerId: req.user.id,
      folderId: body.folderId ?? null,
      versionId: null,
      checksum: body.checksum ?? null,
      status: "uploading",
      isDeleted: false,
      deletedAt: null,
      createdAt: mem.now(),
      updatedAt: mem.now(),
    };
    mem.files.push(file);
    const origin = `${req.protocol}://${req.get("host")}`;
    const bytesUrl = `/api/files/${fileId}/bytes`;
    res.status(201).json({
      fileId,
      storageKey,
      upload: {
        method: "put",
        url: bytesUrl,
        parts: [{ partNumber: 1, url: bytesUrl }],
        expiresInSeconds: 3600,
      },
    });
  } catch (err) {
    if (err.name === "ZodError") return next(fail(400, "VALIDATION", err.errors[0]?.message ?? "Invalid payload"));
    next(err);
  }
});

const tempUploads = new Map();

filesRouter.put("/:id/bytes", requireAuth, async (req, res, next) => {
  try {
    await assertWrite(req.user.id, "file", req.params.id);
    const file = await getFile(req.params.id);
    
    // Ensure we handle the request body as a buffer
    let buf = req.body;
    if (!Buffer.isBuffer(buf)) {
      // If it's a string or other type, convert to buffer
      buf = typeof buf === 'string' ? Buffer.from(buf) : Buffer.from(JSON.stringify(buf));
    }
    
    file.sizeBytes = buf.length;
    file.updatedAt = mem.now();
    const etag = `"${crypto.createHash("md5").update(buf).digest("hex")}"`;

    // PERSISTENCE FIX FOR SERVERLESS: 
    // Save the bytes directly to the database in this request.
    // In serverless, the next "complete" request might hit a different instance.
    if (pool) {
      await pool.query("UPDATE files SET size_bytes = $1, updated_at = $2 WHERE id = $3", [buf.length, file.updatedAt, file.id]);
      
      // Also update or create the version immediately so the data is safe
      const existingVersion = mem.versions.find(v => v.fileId === file.id);
      if (existingVersion) {
        existingVersion.fileData = buf;
        existingVersion.sizeBytes = buf.length;
        await pool.query("UPDATE file_versions SET file_data = $1, size_bytes = $2 WHERE id = $3", [buf, buf.length, existingVersion.id]);
      } else {
        // Create initial version if it doesn't exist yet
        const versionId = mem.id();
        const newVersion = {
          id: versionId,
          fileId: file.id,
          versionNumber: 1,
          storageKey: file.storageKey,
          sizeBytes: buf.length,
          checksum: file.checksum,
          fileData: buf,
          createdAt: mem.now(),
        };
        mem.versions.push(newVersion);
        file.versionId = versionId;
        await pool.query("UPDATE files SET version_id = $1 WHERE id = $2", [versionId, file.id]);
        // Note: mem.versions.push already triggers dbInsert if not isInitialLoad
      }
    } else {
      // Fallback for memory-only mode
      tempUploads.set(file.id, buf);
    }

    res.setHeader("etag", etag);
    res.json({ ok: true, etag, sizeBytes: buf.length });
  } catch (err) {
    next(err);
  }
});

filesRouter.post("/complete", requireAuth, async (req, res, next) => {
  try {
    const body = completeSchema.parse(req.body);
    await assertWrite(req.user.id, "file", body.fileId);
    const file = await getFile(body.fileId);
    if (body.checksum) file.checksum = body.checksum;
    file.status = "ready";
    file.updatedAt = mem.now();

    // Detect if this should be a new version: if a prior "ready" file exists in
    // the same parent with the same name, archive its current version.
    if (file.folderId || file.folderId === null) {
      const prior = mem.files.find(
        (f) =>
          f.id !== file.id &&
          f.ownerId === file.ownerId &&
          f.folderId === file.folderId &&
          f.name === file.name &&
          f.status === "ready" &&
          !f.isDeleted,
      );
      if (prior) {
        // Versioning logic...
        const version = {
          id: mem.id(),
          fileId: prior.id,
          versionNumber: (mem.versions.filter((v) => v.fileId === prior.id).length || 0) + 1,
          storageKey: prior.storageKey,
          sizeBytes: prior.sizeBytes,
          checksum: prior.checksum,
          createdAt: mem.now(),
        };
        mem.versions.push(version);
        prior.versionId = version.id;
        prior.isDeleted = true;
        prior.deletedAt = mem.now();
      }
    }

    // Ensure the current file has a version if one wasn't created in /bytes
    if (!file.versionId) {
      const version = {
        id: mem.id(),
        fileId: file.id,
        versionNumber: 1,
        storageKey: file.storageKey,
        sizeBytes: file.sizeBytes,
        checksum: file.checksum,
        createdAt: mem.now(),
      };
      mem.versions.push(version);
      file.versionId = version.id;
    }

    // Transfer cached upload buffer to the newly created version (Memory-only fallback)
    const buf = tempUploads.get(file.id);
    if (buf) {
      const activeVersion = mem.versions.find((v) => v.id === file.versionId);
      if (activeVersion) {
        activeVersion.fileData = buf;
        if (pool) {
          await pool.query("UPDATE file_versions SET file_data = $1 WHERE id = $2", [buf, activeVersion.id]);
        }
      }
      tempUploads.delete(file.id);
    }

    if (pool) {
      await pool.query("UPDATE files SET status = $1, updated_at = $2, checksum = $3 WHERE id = $4", ["ready", file.updatedAt, file.checksum, file.id]);
    }

    logActivity(req.user.id, "upload", "file", file.id, { name: file.name, sizeBytes: file.sizeBytes });
    res.json({ file: camelFile(file) });
  } catch (err) {
    if (err.name === "ZodError") return next(fail(400, "VALIDATION", err.errors[0]?.message ?? "Invalid payload"));
    next(err);
  }
});

filesRouter.get("/recent", requireAuth, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const items = mem.activities
    .filter((a) => a.actorId === req.user.id && a.action === "upload" && a.resourceType === "file")
    .slice(0, limit)
    .map((a) => {
      const f = mem.files.find((x) => x.id === a.resourceId);
      return f && !f.isDeleted ? camelFile(f) : null;
    })
    .filter(Boolean);
  res.json({ items });
});

filesRouter.get("/starred", requireAuth, (req, res) => {
  const keys = mem.stars.filter((s) => s.userId === req.user.id);
  const files = [];
  const folders = [];
  for (const s of keys) {
    if (s.resourceType === "file") {
      const f = mem.files.find((x) => x.id === s.resourceId && !x.isDeleted);
      if (f) files.push(camelFile(f));
    } else {
      const f = mem.folders.find((x) => x.id === s.resourceId && !x.isDeleted && x.ownerId === req.user.id);
      if (f) folders.push(f);
    }
  }
  res.json({ files, folders });
});

filesRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    if (req.params.id === "recent" || req.params.id === "starred" || req.params.id === "init" || req.params.id === "complete") {
      return next();
    }
    await assertRead(req.user.id, "file", req.params.id);
    const file = await getFile(req.params.id);
    const { exp, sig } = signedUrlToken(file.id, 60_000);
    const origin = `${req.protocol}://${req.get("host")}`;
    res.json({
      file: camelFile(file),
      signedUrl: `${origin}/api/files/${file.id}/download?exp=${exp}&sig=${sig}`,
    });
  } catch (err) {
    next(err);
  }
});

filesRouter.get("/:id/download", async (req, res, next) => {
  try {
    let file = mem.files.find((x) => x.id === req.params.id && !x.isDeleted);
    if (!file && mem.findFile) {
      file = await mem.findFile(req.params.id);
    }
    if (!file || file.isDeleted) throw fail(404, "NOT_FOUND", "File not found");

    // Allow access if either authenticated OR valid signed URL token is present
    let hasAccess = false;
    try {
      await new Promise((resolve, reject) => {
        requireAuth(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      hasAccess = true;
    } catch (e) {
      // Not authenticated, check signed token
    }

    if (!hasAccess) {
      const { exp, sig } = req.query;
      if (!verifySignedUrlToken(file.id, exp, sig)) {
        throw fail(401, "UNAUTHENTICATED", "Sign in required or invalid link");
      }
      hasAccess = true;
    }

    if (!hasAccess) throw fail(401, "UNAUTHENTICATED", "Sign in required");
    await assertRead(req.user?.id || file.ownerId, "file", req.params.id);

    // Try in-memory cache first, then query database
    const version = mem.versions.find((v) => v.fileId === file.id);
    let data = version?.fileData;
    if (!data && pool) {
      const dbRes = await pool.query("SELECT file_data FROM file_versions WHERE file_id = $1 ORDER BY version_number DESC LIMIT 1", [file.id]);
      if (dbRes.rows[0]?.file_data) {
        data = dbRes.rows[0].file_data;
        if (version) version.fileData = data; // cache it
      }
    }
    if (!data) throw fail(404, "NOT_FOUND", "File data not found in database");

    logActivity(req.user.id, "download", "file", file.id, {});
    res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
    res.setHeader("Cache-Control", "private, max-age=60");
    if (req.query.inline === "true") {
      res.setHeader("Content-Disposition", "inline");
    } else {
      res.setHeader("Content-Disposition", `attachment; filename="${file.name}"`);
    }
    res.send(data);
  } catch (err) {
    next(err);
  }
});

// Public (link-token) download — valid for files served through public links.
filesRouter.get("/:id/public-download", async (req, res, next) => {
  try {
    const token = String(req.query.token || "");
    const link = mem.links.find((l) => l.token === token);
    if (!link) throw fail(404, "NOT_FOUND", "Invalid link");
    if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
      throw fail(410, "EXPIRED", "This link has expired");
    }
    if (link.passwordHash) {
      const password = req.query.password || req.body?.password;
      if (!password || !(await import("bcryptjs")).default.compare(String(password), link.passwordHash)) {
        throw fail(401, "UNAUTHENTICATED", "Password required");
      }
    }
    if (link.resourceType !== "file" || link.resourceId !== req.params.id) {
      throw fail(404, "NOT_FOUND", "Link does not point to this file");
    }
    const file = await getFile(req.params.id);
    if (!file) throw fail(404, "NOT_FOUND", "File not found");

    let version = mem.versions.find((v) => v.id === file.versionId) || mem.versions.find((v) => v.fileId === file.id && v.fileData);
    let data = version?.fileData || tempUploads.get(file.id);
    if (!data && pool) {
      const dbRes = await pool.query("SELECT file_data FROM file_versions WHERE file_id = $1 ORDER BY version_number DESC LIMIT 1", [file.id]);
      if (dbRes.rows[0]?.file_data) data = dbRes.rows[0].file_data;
    }
    if (!data) throw fail(404, "NOT_FOUND", "File data not found in database");

    res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
    if (req.query.inline === "true") {
      res.setHeader("Content-Disposition", "inline");
    } else {
      res.setHeader("Content-Disposition", `attachment; filename="${file.name}"`);
    }
    res.send(data);
  } catch (err) {
    next(err);
  }
});

filesRouter.get("/:id/thumbnail", async (req, res, next) => {
  try {
    let file = mem.files.find((x) => x.id === req.params.id && !x.isDeleted);
    if (!file && mem.findFile) {
      file = await mem.findFile(req.params.id);
    }
    if (!file || file.isDeleted) throw fail(404, "NOT_FOUND", "File not found");

    // Allow access if either authenticated OR valid signed URL token is present
    let hasAccess = false;
    try {
      await new Promise((resolve, reject) => {
        requireAuth(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      hasAccess = true;
    } catch (e) {
      // Not authenticated
    }

    if (!hasAccess) {
      const { exp, sig } = req.query;
      if (!verifySignedUrlToken(file.id, exp, sig)) {
        // Fallback to placeholder for thumbnails if not signed/auth
        return res.json({
          kind: "placeholder",
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          label: path.extname(file.name).replace(".", "").toUpperCase() || "FILE",
        });
      }
    }

    await assertRead(req.user?.id || file.ownerId, "file", req.params.id);

    const version = mem.versions.find((v) => v.fileId === file.id);
    let data = version?.fileData;
    if (!data && pool) {
      const dbRes = await pool.query("SELECT file_data FROM file_versions WHERE file_id = $1 ORDER BY version_number DESC LIMIT 1", [file.id]);
      if (dbRes.rows[0]?.file_data) {
        data = dbRes.rows[0].file_data;
        if (version) version.fileData = data;
      }
    }

    const mt = (file.mimeType || "").toLowerCase();
    if (data && mt.startsWith("image/")) {
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Cache-Control", "private, max-age=300");
      return res.end(data);
    }
    // For non-image or missing data: return a small JSON descriptor
    res.json({
      kind: "placeholder",
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      label: path.extname(file.name).replace(".", "").toUpperCase() || "FILE",
    });
  } catch (err) {
    next(err);
  }
});

filesRouter.get("/:id/versions", requireAuth, async (req, res, next) => {
  try {
    await assertRead(req.user.id, "file", req.params.id);
    const versions = mem.versions
      .filter((v) => v.fileId === req.params.id)
      .sort((a, b) => b.versionNumber - a.versionNumber);
    res.json({ versions });
  } catch (err) {
    next(err);
  }
});

filesRouter.post("/:id/versions/:versionId/restore", requireAuth, async (req, res, next) => {
  try {
    await assertWrite(req.user.id, "file", req.params.id);
    const file = await getFile(req.params.id);
    const version = mem.versions.find((v) => v.id === req.params.versionId && v.fileId === req.params.id);
    if (!version) throw fail(404, "NOT_FOUND", "Version not found");
    // Archive current state
    const newVersion = {
      id: mem.id(),
      fileId: file.id,
      versionNumber: (mem.versions.filter((v) => v.fileId === file.id).length || 0) + 1,
      storageKey: file.storageKey,
      sizeBytes: file.sizeBytes,
      checksum: file.checksum,
      createdAt: mem.now(),
    };
    mem.versions.push(newVersion);
    // Restore from target version
    file.storageKey = version.storageKey;
    file.sizeBytes = version.sizeBytes;
    file.checksum = version.checksum;
    file.versionId = newVersion.id;
    file.updatedAt = mem.now();
    // Copy file_data from the target version to the new current version in DB
    if (pool) {
      await pool.query(
        "UPDATE file_versions SET file_data = (SELECT file_data FROM file_versions WHERE id = $1) WHERE id = $2",
        [version.id, newVersion.id]
      );
    }
    logActivity(req.user.id, "restore", "file", file.id, { versionId: version.id });
    res.json({ file: camelFile(file) });
  } catch (err) {
    next(err);
  }
});

filesRouter.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const body = patchSchema.parse(req.body);
    await assertWrite(req.user.id, "file", req.params.id);
    const file = await getFile(req.params.id);
    if (body.name !== undefined) file.name = sanitizeFilename(body.name);
    if (body.folderId !== undefined) {
      if (body.folderId) await assertWrite(req.user.id, "folder", body.folderId);
      file.folderId = body.folderId;
    }
    file.updatedAt = mem.now();
    logActivity(
      req.user.id,
      body.folderId !== undefined ? "move" : "rename",
      "file",
      file.id,
      { name: file.name, folderId: file.folderId },
    );
    res.json({ file: camelFile(file) });
  } catch (err) {
    if (err.name === "ZodError") return next(fail(400, "VALIDATION", err.errors[0]?.message ?? "Invalid payload"));
    next(err);
  }
});

filesRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    await assertWrite(req.user.id, "file", req.params.id);
    const file = await getFile(req.params.id);
    file.isDeleted = true;
    file.deletedAt = mem.now();
    file.updatedAt = mem.now();
    logActivity(req.user.id, "delete", "file", file.id, {});
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Bulk operations
filesRouter.post("/bulk", requireAuth, async (req, res, next) => {
  try {
    const body = bulkSchema.parse(req.body);
    const results = { ok: 0, failed: 0 };
    for (const id of body.ids) {
      try {
        const file = mem.files.find((f) => f.id === id);
        if (!file || file.ownerId !== req.user.id) {
          results.failed++;
          continue;
        }
        if (body.action === "delete") {
          file.isDeleted = true;
          file.deletedAt = mem.now();
          logActivity(req.user.id, "delete", "file", id, { bulk: true });
        } else if (body.action === "move") {
          if (body.destinationId) await assertWrite(req.user.id, "folder", body.destinationId);
          file.folderId = body.destinationId || null;
          logActivity(req.user.id, "move", "file", id, { folderId: file.folderId, bulk: true });
        } else if (body.action === "star") {
          if (!mem.stars.some((s) => s.userId === req.user.id && s.resourceType === "file" && s.resourceId === id)) {
            mem.stars.push({ userId: req.user.id, resourceType: "file", resourceId: id, createdAt: mem.now() });
          }
        } else if (body.action === "unstar") {
          const i = mem.stars.findIndex(
            (s) => s.userId === req.user.id && s.resourceType === "file" && s.resourceId === id,
          );
          if (i >= 0) mem.stars.splice(i, 1);
        }
        file.updatedAt = mem.now();
        results.ok++;
      } catch {
        results.failed++;
      }
    }
    res.json({ results });
  } catch (err) {
    if (err.name === "ZodError") return next(fail(400, "VALIDATION", err.errors[0]?.message ?? "Invalid payload"));
    next(err);
  }
});

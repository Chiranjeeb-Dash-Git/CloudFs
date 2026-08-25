import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { mem } from "../store.js";
import { camelFile, fail, slugName } from "../util.js";
import { requireAuth } from "../auth.js";
import { assertRead, assertWrite, getFile, logActivity } from "../acl.js";
import { storageDir } from "../config.js";

export const filesRouter = Router();

const initLimiterNote = z.object({
  name: z.string().min(1).max(220),
  mimeType: z.string().min(1).max(180),
  sizeBytes: z.number().int().nonnegative(),
  folderId: z.string().uuid().nullable().optional(),
});

filesRouter.post("/init", requireAuth, (req, res, next) => {
  try {
    const body = initLimiterNote.parse(req.body);
    if (body.folderId) assertWrite(req.user.id, "folder", body.folderId);
    const fileId = mem.id();
    const ext = path.extname(body.name);
    const storageKey = `tenants/${req.user.id}/folders/${body.folderId ?? "root"}/files/${fileId}-${slugName(body.name)}${ext}`;
    const file = {
      id: fileId,
      name: body.name.replace(/[/\\]/g, "_"),
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      storageKey,
      ownerId: req.user.id,
      folderId: body.folderId ?? null,
      versionId: null,
      checksum: null,
      status: "uploading",
      isDeleted: false,
      createdAt: mem.now(),
      updatedAt: mem.now(),
    };
    mem.files.push(file);
    const origin = `${req.protocol}://${req.get("host")}`;
    res.status(201).json({
      fileId,
      storageKey,
      upload: {
        method: "put",
        url: `${origin}/api/files/${fileId}/bytes`,
        parts: [{ partNumber: 1, url: `${origin}/api/files/${fileId}/bytes` }],
      },
    });
  } catch (err) {
    if (err.name === "ZodError") return next(fail(400, "VALIDATION", err.errors[0]?.message ?? "Invalid payload"));
    next(err);
  }
});

filesRouter.put("/:id/bytes", requireAuth, (req, res, next) => {
  try {
    assertWrite(req.user.id, "file", req.params.id);
    const file = getFile(req.params.id);
    const dest = path.join(storageDir, file.id);
    const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
    fs.writeFileSync(dest, buf);
    file.sizeBytes = buf.length;
    res.setHeader("etag", `"${file.sizeBytes}"`);
    res.json({ ok: true, etag: `"${file.sizeBytes}"` });
  } catch (err) {
    next(err);
  }
});

filesRouter.post("/complete", requireAuth, (req, res, next) => {
  try {
    const body = z.object({ fileId: z.string().uuid(), parts: z.array(z.object({ partNumber: z.number(), etag: z.string() })).optional() }).parse(req.body);
    assertWrite(req.user.id, "file", body.fileId);
    const file = getFile(body.fileId);
    file.status = "ready";
    file.updatedAt = mem.now();
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
    logActivity(req.user.id, "upload", "file", file.id, { name: file.name });
    res.json({ file: camelFile(file) });
  } catch (err) {
    next(err);
  }
});

filesRouter.get("/:id", requireAuth, (req, res, next) => {
  try {
    if (req.params.id === "bytes") return next();
    assertRead(req.user.id, "file", req.params.id);
    const file = getFile(req.params.id);
    const origin = `${req.protocol}://${req.get("host")}`;
    res.json({
      file: camelFile(file),
      signedUrl: `${origin}/api/files/${file.id}/download?exp=${Date.now() + 60_000}`,
    });
  } catch (err) {
    next(err);
  }
});

filesRouter.get("/:id/download", requireAuth, (req, res, next) => {
  try {
    assertRead(req.user.id, "file", req.params.id);
    const file = getFile(req.params.id);
    const dest = path.join(storageDir, file.id);
    if (!fs.existsSync(dest)) throw fail(404, "NOT_FOUND", "Object missing from storage");
    logActivity(req.user.id, "download", "file", file.id, {});
    res.setHeader("Content-Disposition", `attachment; filename="${file.name}"`);
    res.sendFile(dest);
  } catch (err) {
    next(err);
  }
});

filesRouter.patch("/:id", requireAuth, (req, res, next) => {
  try {
    const body = z.object({ name: z.string().min(1).optional(), folderId: z.string().uuid().nullable().optional() }).parse(req.body);
    assertWrite(req.user.id, "file", req.params.id);
    const file = getFile(req.params.id);
    if (body.name) file.name = body.name.replace(/[/\\]/g, "_");
    if (body.folderId !== undefined) file.folderId = body.folderId;
    file.updatedAt = mem.now();
    logActivity(req.user.id, body.folderId !== undefined ? "move" : "rename", "file", file.id, body);
    res.json({ file: camelFile(file) });
  } catch (err) {
    next(err);
  }
});

filesRouter.delete("/:id", requireAuth, (req, res, next) => {
  try {
    assertWrite(req.user.id, "file", req.params.id);
    const file = getFile(req.params.id);
    file.isDeleted = true;
    file.updatedAt = mem.now();
    logActivity(req.user.id, "delete", "file", file.id, {});
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

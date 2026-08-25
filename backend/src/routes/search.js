import { Router } from "express";
import { z } from "zod";
import { mem } from "../store.js";
import { camelFile, camelFolder, fail } from "../util.js";
import { requireAuth } from "../auth.js";
import { canRead, getFile, getFolder, logActivity } from "../acl.js";

export const searchRouter = Router();

searchRouter.get("/search", requireAuth, (req, res) => {
  const q = String(req.query.q ?? "").toLowerCase();
  const type = String(req.query.type ?? "");
  const starred = String(req.query.starred ?? "") === "true";
  const folders = mem.folders.filter(
    (f) => !f.isDeleted && canRead(req.user.id, "folder", f.id) && (!q || f.name.toLowerCase().includes(q)),
  );
  const files = mem.files.filter(
    (f) =>
      !f.isDeleted &&
      f.status === "ready" &&
      canRead(req.user.id, "file", f.id) &&
      (!q || f.name.toLowerCase().includes(q)) &&
      (!type || f.mimeType.includes(type)),
  );
  let results = [...folders.map(camelFolder), ...files.map(camelFile)];
  if (starred) {
    const keys = new Set(
      mem.stars.filter((s) => s.userId === req.user.id).map((s) => `${s.resourceType}:${s.resourceId}`),
    );
    results = results.filter((r) => keys.has(`file:${r.id}`) || keys.has(`folder:${r.id}`));
  }
  res.json({ results });
});

searchRouter.post("/stars", requireAuth, (req, res, next) => {
  try {
    const body = z.object({ resourceType: z.enum(["file", "folder"]), resourceId: z.string().uuid() }).parse(req.body);
    mem.stars.push({ userId: req.user.id, resourceType: body.resourceType, resourceId: body.resourceId });
    res.status(201).json({ ok: true });
  } catch (err) {
    next(fail(400, "VALIDATION", "Invalid star payload"));
  }
});

searchRouter.delete("/stars", requireAuth, (req, res, next) => {
  try {
    const body = z.object({ resourceType: z.enum(["file", "folder"]), resourceId: z.string().uuid() }).parse(req.body);
    const idx = mem.stars.findIndex(
      (s) => s.userId === req.user.id && s.resourceType === body.resourceType && s.resourceId === body.resourceId,
    );
    if (idx >= 0) mem.stars.splice(idx, 1);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

searchRouter.get("/trash", requireAuth, (req, res) => {
  const folders = mem.folders.filter((f) => f.ownerId === req.user.id && f.isDeleted).map(camelFolder);
  const files = mem.files.filter((f) => f.ownerId === req.user.id && f.isDeleted).map(camelFile);
  res.json({ items: [...folders, ...files] });
});

searchRouter.post("/trash/restore", requireAuth, (req, res, next) => {
  try {
    const body = z.object({ resourceType: z.enum(["file", "folder"]), resourceId: z.string().uuid() }).parse(req.body);
    const resource = body.resourceType === "file" ? getFile(body.resourceId) : getFolder(body.resourceId);
    if (!resource || resource.ownerId !== req.user.id) throw fail(404, "NOT_FOUND", "Item not found");
    resource.isDeleted = false;
    resource.updatedAt = mem.now();
    logActivity(req.user.id, "restore", body.resourceType, body.resourceId, {});
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

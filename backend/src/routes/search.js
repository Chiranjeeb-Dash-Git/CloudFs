import { Router } from "express";
import { z } from "zod";
import { mem } from "../store.js";
import { camelFile, camelFolder, fail } from "../util.js";
import { requireAuth } from "../auth.js";
import { canRead, getFile, getFolder, logActivity } from "../acl.js";

export const searchRouter = Router();

searchRouter.get("/search", requireAuth, (req, res) => {
  const q = String(req.query.q ?? "").toLowerCase().trim();
  const type = String(req.query.type ?? "");
  const starred = String(req.query.starred ?? "") === "true";
  const owner = String(req.query.owner ?? "");
  const mime = String(req.query.mime ?? "");
  const sort = String(req.query.sort ?? "updatedAt"); // name | size | updatedAt | createdAt
  const order = String(req.query.order ?? "desc");

  const folders = mem.folders
    .filter(
      (f) =>
        !f.isDeleted &&
        canRead(req.user.id, "folder", f.id) &&
        (!q || f.name.toLowerCase().includes(q)) &&
        (!owner || f.ownerId === owner),
    )
    .map(camelFolder);

  const files = mem.files
    .filter(
      (f) =>
        !f.isDeleted &&
        f.status === "ready" &&
        canRead(req.user.id, "file", f.id) &&
        (!q || f.name.toLowerCase().includes(q)) &&
        (!type || (f.mimeType || "").includes(type)) &&
        (!mime || (f.mimeType || "").includes(mime)) &&
        (!owner || f.ownerId === owner),
    )
    .map(camelFile);

  let results = [...folders, ...files];
  if (starred) {
    const keys = new Set(
      mem.stars.filter((s) => s.userId === req.user.id).map((s) => `${s.resourceType}:${s.resourceId}`),
    );
    results = results.filter((r) => keys.has(`file:${r.id}`) || keys.has(`folder:${r.id}`));
  }

  const dir = order === "asc" ? 1 : -1;
  results.sort((a, b) => {
    const av = a[sort] ?? "";
    const bv = b[sort] ?? "";
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });

  res.json({ results, total: results.length });
});

const starSchema = z.object({
  resourceType: z.enum(["file", "folder"]),
  resourceId: z.string().uuid(),
});

searchRouter.post("/stars", requireAuth, (req, res, next) => {
  try {
    const body = starSchema.parse(req.body);
    if (!mem.stars.some((s) => s.userId === req.user.id && s.resourceType === body.resourceType && s.resourceId === body.resourceId)) {
      mem.stars.push({ userId: req.user.id, resourceType: body.resourceType, resourceId: body.resourceId, createdAt: mem.now() });
    }
    res.status(201).json({ ok: true, starred: true });
  } catch (err) {
    next(fail(400, "VALIDATION", "Invalid star payload"));
  }
});

searchRouter.delete("/stars", requireAuth, (req, res, next) => {
  try {
    const body = starSchema.parse(req.body);
    const idx = mem.stars.findIndex(
      (s) => s.userId === req.user.id && s.resourceType === body.resourceType && s.resourceId === body.resourceId,
    );
    if (idx >= 0) mem.stars.splice(idx, 1);
    res.json({ ok: true, starred: false });
  } catch (err) {
    next(fail(400, "VALIDATION", "Invalid star payload"));
  }
});

searchRouter.get("/stars", requireAuth, async (req, res) => {
  const myStars = mem.stars.filter((s) => s.userId === req.user.id);
  const items = [];
  for (const s of myStars) {
    const r = s.resourceType === "file" ? await getFile(s.resourceId) : await getFolder(s.resourceId);
    if (r && !r.isDeleted) {
      items.push({
        resourceType: s.resourceType,
        resourceId: s.resourceId,
        createdAt: s.createdAt,
        resource: s.resourceType === "file" ? camelFile(r) : camelFolder(r),
      });
    }
  }
  res.json({ items });
});

const TRASH_RETENTION_DAYS = 30;

function daysSince(iso) {
  if (!iso) return 0;
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

searchRouter.get("/trash", requireAuth, (req, res) => {
  const folders = mem.folders
    .filter((f) => f.ownerId === req.user.id && f.isDeleted)
    .map((f) => ({ ...camelFolder(f), daysRemaining: Math.max(0, Math.ceil(TRASH_RETENTION_DAYS - daysSince(f.deletedAt))) }));
  const files = mem.files
    .filter((f) => f.ownerId === req.user.id && f.isDeleted)
    .map((f) => ({ ...camelFile(f), daysRemaining: Math.max(0, Math.ceil(TRASH_RETENTION_DAYS - daysSince(f.deletedAt))) }));
  res.json({ items: [...folders, ...files], retentionDays: TRASH_RETENTION_DAYS });
});

searchRouter.post("/trash/restore", requireAuth, async (req, res, next) => {
  try {
    const body = z.object({ resourceType: z.enum(["file", "folder"]), resourceId: z.string().uuid() }).parse(req.body);
    const resource = body.resourceType === "file" ? await getFile(body.resourceId) : await getFolder(body.resourceId);
    if (!resource || resource.ownerId !== req.user.id) throw fail(404, "NOT_FOUND", "Item not found");
    resource.isDeleted = false;
    resource.deletedAt = null;
    resource.updatedAt = mem.now();
    logActivity(req.user.id, "restore", body.resourceType, body.resourceId, {});
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

searchRouter.delete("/trash/:resourceType/:resourceId", requireAuth, async (req, res, next) => {
  try {
    const { resourceType, resourceId } = req.params;
    if (!["file", "folder"].includes(resourceType)) throw fail(400, "VALIDATION", "Invalid resource type");
    const resource = resourceType === "file" ? await getFile(resourceId) : await getFolder(resourceId);
    if (!resource || resource.ownerId !== req.user.id) throw fail(404, "NOT_FOUND", "Item not found");
    if (!resource.isDeleted) throw fail(400, "VALIDATION", "Item is not in trash");
    // Permanently delete: remove from in-memory + remove any shares/links/stars
    if (resourceType === "file") {
      const idx = mem.files.findIndex((f) => f.id === resourceId);
      if (idx >= 0) mem.files.splice(idx, 1);
    } else {
      const idx = mem.folders.findIndex((f) => f.id === resourceId);
      if (idx >= 0) mem.folders.splice(idx, 1);
    }
    for (let i = mem.shares.length - 1; i >= 0; i--) {
      if (mem.shares[i].resourceType === resourceType && mem.shares[i].resourceId === resourceId) {
        mem.shares.splice(i, 1);
      }
    }
    for (let i = mem.links.length - 1; i >= 0; i--) {
      if (mem.links[i].resourceType === resourceType && mem.links[i].resourceId === resourceId) {
        mem.links.splice(i, 1);
      }
    }
    for (let i = mem.stars.length - 1; i >= 0; i--) {
      if (mem.stars[i].resourceType === resourceType && mem.stars[i].resourceId === resourceId) {
        mem.stars.splice(i, 1);
      }
    }
    for (let i = mem.versions.length - 1; i >= 0; i--) {
      if (resourceType === "file" && mem.versions[i].fileId === resourceId) {
        mem.versions.splice(i, 1);
      }
    }
    logActivity(req.user.id, "delete", resourceType, resourceId, { permanent: true });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

searchRouter.post("/trash/empty", requireAuth, (req, res) => {
  let removed = 0;
  for (let i = mem.folders.length - 1; i >= 0; i--) {
    if (mem.folders[i].ownerId === req.user.id && mem.folders[i].isDeleted) {
      mem.folders.splice(i, 1);
      removed++;
    }
  }
  for (let i = mem.files.length - 1; i >= 0; i--) {
    if (mem.files[i].ownerId === req.user.id && mem.files[i].isDeleted) {
      mem.files.splice(i, 1);
      removed++;
    }
  }
  res.json({ ok: true, removed });
});

// Periodic purge of items past retention. Public for cron-like triggers.
searchRouter.post("/trash/purge-expired", requireAuth, (req, res) => {
  let purged = 0;
  for (let i = mem.folders.length - 1; i >= 0; i--) {
    if (mem.folders[i].ownerId === req.user.id && mem.folders[i].isDeleted && daysSince(mem.folders[i].deletedAt) > TRASH_RETENTION_DAYS) {
      mem.folders.splice(i, 1);
      purged++;
    }
  }
  for (let i = mem.files.length - 1; i >= 0; i--) {
    if (mem.files[i].ownerId === req.user.id && mem.files[i].isDeleted && daysSince(mem.files[i].deletedAt) > TRASH_RETENTION_DAYS) {
      mem.files.splice(i, 1);
      purged++;
    }
  }
  res.json({ ok: true, purged });
});

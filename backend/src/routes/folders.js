import { Router } from "express";
import { z } from "zod";
import { mem } from "../store.js";
import { camelFolder, camelFile, fail, sanitizeFilename } from "../util.js";
import { requireAuth } from "../auth.js";
import { assertRead, assertWrite, folderPath, getFolder, logActivity } from "../acl.js";

export const foldersRouter = Router();
foldersRouter.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(1).max(180),
  parentId: z.string().uuid().nullable().optional(),
});

const patchSchema = z.object({
  name: z.string().min(1).max(180).optional(),
  parentId: z.string().uuid().nullable().optional(),
});

function descendantsSize(folderId) {
  let total = 0;
  const stack = [folderId];
  const seen = new Set();
  while (stack.length) {
    const cur = stack.pop();
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const child of mem.folders.filter((f) => f.parentId === cur && !f.isDeleted)) {
      stack.push(child.id);
    }
    for (const file of mem.files.filter((f) => f.folderId === cur && !f.isDeleted)) {
      total += Number(file.sizeBytes || 0);
    }
  }
  return total;
}

foldersRouter.post("/", async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const parentId = body.parentId ?? null;
    if (parentId) await assertWrite(req.user.id, "folder", parentId);
    const dup = mem.folders.find(
      (f) => f.ownerId === req.user.id && f.parentId === parentId && f.name === body.name && !f.isDeleted,
    );
    if (dup) throw fail(409, "CONFLICT", "A folder with that name already exists here");
    const folder = {
      id: mem.id(),
      name: sanitizeFilename(body.name),
      ownerId: req.user.id,
      parentId,
      isDeleted: false,
      deletedAt: null,
      createdAt: mem.now(),
      updatedAt: mem.now(),
    };
    mem.folders.push(folder);
    logActivity(req.user.id, "upload", "folder", folder.id, { name: folder.name });
    res.status(201).json({ folder: camelFolder(folder) });
  } catch (err) {
    if (err.name === "ZodError") return next(fail(400, "VALIDATION", err.errors[0]?.message ?? "Invalid payload"));
    next(err);
  }
});

foldersRouter.get("/tree", (req, res) => {
  const mine = mem.folders.filter((f) => f.ownerId === req.user.id && !f.isDeleted);
  const byParent = new Map();
  for (const f of mine) {
    const key = f.parentId || "__root__";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(f);
  }
  function build(parentId) {
    return (byParent.get(parentId) || []).map((f) => ({
      ...camelFolder(f),
      children: build(f.id),
    }));
  }
  res.json({ tree: build("__root__") });
});

foldersRouter.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === "root") {
      const folders = mem.folders.filter((f) => f.ownerId === req.user.id && !f.parentId && !f.isDeleted).map(camelFolder);
      const files = mem.files.filter((f) => f.ownerId === req.user.id && !f.folderId && !f.isDeleted).map(camelFile);
      return res.json({ folder: null, children: { folders, files }, path: [] });
    }
    await assertRead(req.user.id, "folder", id);
    const folder = await getFolder(id);
    const folders = mem.folders.filter((f) => f.parentId === id && !f.isDeleted).map(camelFolder);
    const files = mem.files.filter((f) => f.folderId === id && !f.isDeleted).map(camelFile);
    const pathFolders = await folderPath(id);
    res.json({
      folder: camelFolder(folder),
      children: { folders, files },
      path: pathFolders.map(camelFolder),
      totalSizeBytes: descendantsSize(id),
    });
  } catch (err) {
    next(err);
  }
});

foldersRouter.patch("/:id", async (req, res, next) => {
  try {
    const body = patchSchema.parse(req.body);
    await assertWrite(req.user.id, "folder", req.params.id);
    const folder = await getFolder(req.params.id);
    if (body.name !== undefined) folder.name = sanitizeFilename(body.name);
    if (body.parentId !== undefined) {
      if (body.parentId === folder.id) throw fail(400, "VALIDATION", "Cannot move folder into itself");
      if (body.parentId) {
        // Prevent cycle
        const currentPath = await folderPath(body.parentId);
        const path = currentPath.map((f) => f.id);
        if (path.includes(folder.id)) throw fail(400, "VALIDATION", "Move would create a cycle");
        await assertWrite(req.user.id, "folder", body.parentId);
      }
      folder.parentId = body.parentId;
    }
    folder.updatedAt = mem.now();
    logActivity(
      req.user.id,
      body.parentId !== undefined ? "move" : "rename",
      "folder",
      folder.id,
      { name: folder.name, parentId: folder.parentId },
    );
    res.json({ folder: camelFolder(folder) });
  } catch (err) {
    if (err.name === "ZodError") return next(fail(400, "VALIDATION", err.errors[0]?.message ?? "Invalid payload"));
    next(err);
  }
});

foldersRouter.delete("/:id", async (req, res, next) => {
  try {
    await assertWrite(req.user.id, "folder", req.params.id);
    const folder = await getFolder(req.params.id);
    folder.isDeleted = true;
    folder.deletedAt = mem.now();
    folder.updatedAt = mem.now();
    logActivity(req.user.id, "delete", "folder", folder.id, {});
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Bulk operations
const bulkSchema = z.object({
  ids: z.array(z.string()).min(1).max(200),
  action: z.enum(["delete", "move", "star", "unstar"]),
  destinationId: z.string().uuid().nullable().optional(),
});

foldersRouter.post("/bulk", (req, res, next) => {
  try {
    const body = bulkSchema.parse(req.body);
    const results = { ok: 0, failed: 0 };
    for (const id of body.ids) {
      try {
        const folder = mem.folders.find((f) => f.id === id);
        if (!folder || folder.ownerId !== req.user.id) {
          results.failed++;
          continue;
        }
        if (body.action === "delete") {
          folder.isDeleted = true;
          folder.deletedAt = mem.now();
          logActivity(req.user.id, "delete", "folder", id, { bulk: true });
        } else if (body.action === "move") {
          if (body.destinationId) assertWrite(req.user.id, "folder", body.destinationId);
          folder.parentId = body.destinationId || null;
          logActivity(req.user.id, "move", "folder", id, { parentId: folder.parentId, bulk: true });
        } else if (body.action === "star") {
          if (!mem.stars.some((s) => s.userId === req.user.id && s.resourceType === "folder" && s.resourceId === id)) {
            mem.stars.push({ userId: req.user.id, resourceType: "folder", resourceId: id, createdAt: mem.now() });
          }
        } else if (body.action === "unstar") {
          const i = mem.stars.findIndex(
            (s) => s.userId === req.user.id && s.resourceType === "folder" && s.resourceId === id,
          );
          if (i >= 0) mem.stars.splice(i, 1);
        }
        folder.updatedAt = mem.now();
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

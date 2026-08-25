import { Router } from "express";
import { z } from "zod";
import { mem } from "../store.js";
import { camelFolder, camelFile, fail } from "../util.js";
import { requireAuth } from "../auth.js";
import { assertRead, assertWrite, folderPath, getFolder, logActivity } from "../acl.js";

export const foldersRouter = Router();
foldersRouter.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(1).max(180),
  parentId: z.string().uuid().nullable().optional(),
});

foldersRouter.post("/", (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const parentId = body.parentId ?? null;
    if (parentId) assertWrite(req.user.id, "folder", parentId);
    const dup = mem.folders.find(
      (f) => f.ownerId === req.user.id && f.parentId === parentId && f.name === body.name && !f.isDeleted,
    );
    if (dup) throw fail(409, "CONFLICT", "A folder with that name already exists here");
    const folder = {
      id: mem.id(),
      name: body.name,
      ownerId: req.user.id,
      parentId,
      isDeleted: false,
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

foldersRouter.get("/:id", (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === "root") {
      const folders = mem.folders.filter((f) => f.ownerId === req.user.id && !f.parentId && !f.isDeleted).map(camelFolder);
      const files = mem.files.filter((f) => f.ownerId === req.user.id && !f.folderId && !f.isDeleted).map(camelFile);
      return res.json({ folder: null, children: { folders, files }, path: [] });
    }
    assertRead(req.user.id, "folder", id);
    const folder = getFolder(id);
    const folders = mem.folders.filter((f) => f.parentId === id && !f.isDeleted).map(camelFolder);
    const files = mem.files.filter((f) => f.folderId === id && !f.isDeleted).map(camelFile);
    res.json({
      folder: camelFolder(folder),
      children: { folders, files },
      path: folderPath(id).map(camelFolder),
    });
  } catch (err) {
    next(err);
  }
});

foldersRouter.patch("/:id", (req, res, next) => {
  try {
    const body = z.object({ name: z.string().min(1).max(180).optional(), parentId: z.string().uuid().nullable().optional() }).parse(req.body);
    assertWrite(req.user.id, "folder", req.params.id);
    const folder = getFolder(req.params.id);
    if (body.name) folder.name = body.name;
    if (body.parentId !== undefined) folder.parentId = body.parentId;
    folder.updatedAt = mem.now();
    logActivity(req.user.id, body.parentId !== undefined ? "move" : "rename", "folder", folder.id, body);
    res.json({ folder: camelFolder(folder) });
  } catch (err) {
    next(err);
  }
});

foldersRouter.delete("/:id", (req, res, next) => {
  try {
    assertWrite(req.user.id, "folder", req.params.id);
    const folder = getFolder(req.params.id);
    folder.isDeleted = true;
    folder.updatedAt = mem.now();
    logActivity(req.user.id, "delete", "folder", folder.id, {});
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

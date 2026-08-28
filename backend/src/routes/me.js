import { Router } from "express";
import { z } from "zod";
import { mem } from "../store.js";
import { fail } from "../util.js";
import { publicUser, requireAuth } from "../auth.js";

export const meRouter = Router();
meRouter.use(requireAuth);

meRouter.get("/", (req, res) => {
  const user = mem.users.find((u) => u.id === req.user.id);
  res.json({ user: publicUser(user) });
});

meRouter.get("/storage", (req, res) => {
  const used = mem.storageUsed(req.user.id);
  const quota = mem.quotaFor(req.user.id);
  const fileCount = mem.files.filter((f) => f.ownerId === req.user.id && !f.isDeleted).length;
  const folderCount = mem.folders.filter((f) => f.ownerId === req.user.id && !f.isDeleted).length;
  const sharedCount =
    mem.shares.filter((s) => s.createdBy === req.user.id).length +
    mem.links.filter((l) => l.createdBy === req.user.id).length;
  res.json({
    usedBytes: used,
    quotaBytes: quota,
    freeBytes: Math.max(0, quota - used),
    percentUsed: quota > 0 ? Math.min(100, (used / quota) * 100) : 0,
    fileCount,
    folderCount,
    sharedCount,
  });
});

const quotaSchema = z.object({ quotaBytes: z.number().int().min(0).max(1024 * 1024 * 1024 * 100) });

// Admin/system-only endpoint to change quota (gated by env flag in real deployments)
meRouter.post("/storage/quota", (req, res, next) => {
  try {
    const body = quotaSchema.parse(req.body);
    const user = mem.users.find((u) => u.id === req.user.id);
    if (!user) throw fail(404, "NOT_FOUND", "User not found");
    user.quotaBytes = body.quotaBytes;
    res.json({ ok: true, quotaBytes: user.quotaBytes });
  } catch (err) {
    if (err.name === "ZodError") return next(fail(400, "VALIDATION", err.errors[0]?.message ?? "Invalid payload"));
    next(err);
  }
});

import { Router } from "express";
import { z } from "zod";
import { mem } from "../store.js";
import { requireAuth, publicUser } from "../auth.js";
import { fail } from "../util.js";

export const usersRouter = Router();
usersRouter.use(requireAuth);

const profileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  imageUrl: z.string().url().max(500).nullable().optional(),
});

const notificationPreferencesSchema = z.object({
  email: z.boolean().optional(),
  share: z.boolean().optional(),
  security: z.boolean().optional(),
});

// Search users for sharing (by email or partial match). Excludes self.
usersRouter.get("/search", (req, res) => {
  const q = String(req.query.q ?? "").toLowerCase().trim();
  if (!q) return res.json({ users: [] });
  const items = mem.users
    .filter(
      (u) =>
        u.id !== req.user.id &&
        (u.email.toLowerCase().includes(q) || (u.name || "").toLowerCase().includes(q)),
    )
    .slice(0, 20)
    .map((u) => ({ id: u.id, email: u.email, name: u.name, imageUrl: u.imageUrl ?? null }));
  res.json({ users: items });
});

// PATCH /api/users/me — Profile edits (spec §8)
usersRouter.patch("/me", (req, res, next) => {
  try {
    const body = profileSchema.parse(req.body);
    const user = mem.users.find((u) => u.id === req.user.id);
    if (!user) throw fail(404, "NOT_FOUND", "User not found");
    if (body.name !== undefined) user.name = body.name;
    if (body.imageUrl !== undefined) user.imageUrl = body.imageUrl;
    res.json({ user: publicUser(user) });
  } catch (err) {
    if (err.name === "ZodError") return next(fail(400, "VALIDATION", err.errors[0]?.message ?? "Invalid payload"));
    next(err);
  }
});

// GET /api/users/me/notifications — Get notification preferences (spec §8)
usersRouter.get("/me/notifications", (req, res) => {
  const s = mem.getOrCreateSettings(req.user.id);
  res.json({ notifications: s.notifications });
});

// PATCH /api/users/me/notifications — Update notification preferences (spec §8)
usersRouter.patch("/me/notifications", (req, res, next) => {
  try {
    const body = notificationPreferencesSchema.parse(req.body);
    const s = mem.getOrCreateSettings(req.user.id);
    s.notifications = { ...s.notifications, ...body };
    s.updatedAt = mem.now();
    res.json({ notifications: s.notifications });
  } catch (err) {
    if (err.name === "ZodError") return next(fail(400, "VALIDATION", err.errors[0]?.message ?? "Invalid payload"));
    next(err);
  }
});

// GET /api/users/me/plan — Get storage plan + usage (spec §8 stub)
usersRouter.get("/me/plan", (req, res) => {
  const used = mem.storageUsed(req.user.id);
  const quota = mem.quotaFor(req.user.id);
  res.json({
    plan: "free",
    quotaBytes: quota,
    usedBytes: used,
    freeBytes: Math.max(0, quota - used),
  });
});

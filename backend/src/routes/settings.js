import { Router } from "express";
import { z } from "zod";
import { mem } from "../store.js";
import { fail } from "../util.js";
import { requireAuth } from "../auth.js";

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

const updateSchema = z.object({
  plan: z.enum(["free", "pro", "team", "enterprise"]).optional(),
  notifications: z
    .object({
      email: z.boolean().optional(),
      share: z.boolean().optional(),
      security: z.boolean().optional(),
    })
    .optional(),
});

settingsRouter.get("/", (req, res) => {
  const s = mem.getOrCreateSettings(req.user.id);
  res.json({ settings: s });
});

settingsRouter.patch("/", (req, res, next) => {
  try {
    const body = updateSchema.parse(req.body);
    const s = mem.getOrCreateSettings(req.user.id);
    if (body.plan !== undefined) s.plan = body.plan;
    if (body.notifications) {
      s.notifications = { ...s.notifications, ...body.notifications };
    }
    s.updatedAt = mem.now();
    res.json({ settings: s });
  } catch (err) {
    if (err.name === "ZodError") return next(fail(400, "VALIDATION", err.errors[0]?.message ?? "Invalid payload"));
    next(err);
  }
});

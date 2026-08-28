import { Router } from "express";
import { mem } from "../store.js";
import { fail } from "../util.js";
import { requireAuth } from "../auth.js";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get("/", (req, res) => {
  const items = mem.notifications
    .filter((n) => n.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 100);
  const unread = items.filter((n) => !n.readAt).length;
  res.json({ items, unread });
});

notificationsRouter.post("/:id/read", (req, res, next) => {
  try {
    const n = mem.notifications.find((x) => x.id === req.params.id && x.userId === req.user.id);
    if (!n) throw fail(404, "NOT_FOUND", "Notification not found");
    n.readAt = mem.now();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post("/read-all", (req, res) => {
  for (const n of mem.notifications.filter((x) => x.userId === req.user.id && !x.readAt)) {
    n.readAt = mem.now();
  }
  res.json({ ok: true });
});

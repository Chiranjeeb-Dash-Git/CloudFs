import { Router } from "express";
import { mem } from "../store.js";
import { requireAuth } from "../auth.js";

export const usersRouter = Router();
usersRouter.use(requireAuth);

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

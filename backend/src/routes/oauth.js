import { Router } from "express";
import { mem } from "../store.js";
import { fail } from "../util.js";
import { requireAuth } from "../auth.js";

export const oauthRouter = Router();
oauthRouter.use(requireAuth);

// GET /api/oauth/connections — List connected OAuth providers (spec §8)
oauthRouter.get("/connections", (req, res) => {
  const user = mem.users.find((u) => u.id === req.user.id);
  const list = [];
  if (user?.providers?.google) {
    list.push({
      id: "google",
      provider: "google",
      sub: user.providers.google.sub,
      email: user.providers.google.email,
    });
  }
  if (user?.providers?.github) {
    list.push({
      id: "github",
      provider: "github",
      sub: user.providers.github.sub,
      email: user.providers.github.email,
    });
  }
  res.json({ connections: list });
});

// DELETE /api/oauth/connections/:id — Disconnect an OAuth provider (spec §8)
// Block if it's the user's only login method and no password is set.
oauthRouter.delete("/connections/:id", (req, res, next) => {
  try {
    const provider = req.params.id;
    const user = mem.users.find((u) => u.id === req.user.id);
    if (!user) throw fail(404, "NOT_FOUND", "User not found");
    if (!user.providers?.[provider]) {
      throw fail(404, "NOT_FOUND", "Provider not linked");
    }
    // Safety: don't let user disconnect their only sign-in method
    const providerCount = Object.keys(user.providers || {}).length;
    if (!user.passwordHash && providerCount <= 1) {
      throw fail(400, "VALIDATION", "Set a password before unlinking your only sign-in method");
    }
    delete user.providers[provider];
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

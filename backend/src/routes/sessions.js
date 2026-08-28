import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { mem } from "../store.js";
import { fail } from "../util.js";
import { requireAuth } from "../auth.js";

export const sessionsRouter = Router();
sessionsRouter.use(requireAuth);

function shape(s, currentJti) {
  return {
    id: s.id,
    device: s.device,
    os: s.os,
    browser: s.browser,
    ip: s.ip,
    userAgent: s.userAgent,
    lastActiveAt: s.lastActiveAt,
    createdAt: s.createdAt,
    current: s.id === currentJti,
    revokedAt: s.revokedAt,
  };
}

function currentJtiFromReq(req) {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) return null;
    return mem.refresh.get(token)?.jti || null;
  } catch {
    return null;
  }
}

sessionsRouter.get("/", (req, res) => {
  const jti = currentJtiFromReq(req);
  const items = mem.sessions
    .filter((s) => s.userId === req.user.id)
    .sort((a, b) => new Date(b.lastActiveAt) - new Date(a.lastActiveAt))
    .map((s) => shape(s, jti));
  res.json({ items });
});

sessionsRouter.delete("/:id", (req, res, next) => {
  try {
    const jti = currentJtiFromReq(req);
    const session = mem.sessions.find((s) => s.id === req.params.id && s.userId === req.user.id);
    if (!session) throw fail(404, "NOT_FOUND", "Session not found");
    session.revokedAt = mem.now();
    // Invalidate refresh tokens for this session
    for (const [token, data] of mem.refresh.entries()) {
      if (data.jti === session.id) mem.refresh.delete(token);
    }
    res.json({ ok: true, currentRevoked: jti === session.id });
  } catch (err) {
    next(err);
  }
});

sessionsRouter.post("/revoke-others", (req, res) => {
  const jti = currentJtiFromReq(req);
  let count = 0;
  for (const s of mem.sessions.filter((s) => s.userId === req.user.id && !s.revokedAt && s.id !== jti)) {
    s.revokedAt = mem.now();
    for (const [token, data] of mem.refresh.entries()) {
      if (data.jti === s.id) mem.refresh.delete(token);
    }
    count++;
  }
  res.json({ ok: true, revoked: count });
});

// 2FA — basic TOTP-like enable/disable. Real impl would use otpauth/speakeasy.
const twoFactorSchema = z.object({ code: z.string().regex(/^\d{6}$/) });

sessionsRouter.post("/2fa/enable", (req, res, next) => {
  try {
    const { code } = twoFactorSchema.parse(req.body);
    const user = mem.users.find((u) => u.id === req.user.id);
    if (!user) throw fail(404, "NOT_FOUND", "User not found");
    // Provisioning secret is a random 6-digit code for the in-memory demo.
    if (!user.twoFactorSecret) {
      user.twoFactorSecret = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    }
    if (code !== user.twoFactorSecret) {
      throw fail(400, "VALIDATION", "Invalid 2FA code");
    }
    user.twoFactorEnabled = true;
    res.json({ ok: true, twoFactorEnabled: true });
  } catch (err) {
    if (err.name === "ZodError") return next(fail(400, "VALIDATION", err.errors[0]?.message ?? "Invalid payload"));
    next(err);
  }
});

sessionsRouter.post("/2fa/disable", (req, res, next) => {
  try {
    const { code } = twoFactorSchema.parse(req.body);
    const user = mem.users.find((u) => u.id === req.user.id);
    if (!user) throw fail(404, "NOT_FOUND", "User not found");
    if (!user.twoFactorEnabled) return res.json({ ok: true, twoFactorEnabled: false });
    if (code !== user.twoFactorSecret) throw fail(400, "VALIDATION", "Invalid 2FA code");
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    res.json({ ok: true, twoFactorEnabled: false });
  } catch (err) {
    if (err.name === "ZodError") return next(fail(400, "VALIDATION", err.errors[0]?.message ?? "Invalid payload"));
    next(err);
  }
});

// OAuth-connected accounts (read-only listing from stored providers)
sessionsRouter.get("/connected-accounts", (req, res) => {
  const user = mem.users.find((u) => u.id === req.user.id);
  const list = [];
  if (user?.providers?.google) {
    list.push({ provider: "google", sub: user.providers.google.sub, email: user.providers.google.email });
  }
  res.json({ accounts: list });
});

sessionsRouter.delete("/connected-accounts/:provider", (req, res, next) => {
  try {
    const user = mem.users.find((u) => u.id === req.user.id);
    if (!user) throw fail(404, "NOT_FOUND", "User not found");
    if (!user.providers?.[req.params.provider]) throw fail(404, "NOT_FOUND", "Provider not linked");
    if (!user.passwordHash) {
      throw fail(400, "VALIDATION", "Set a password before unlinking your only sign-in method");
    }
    delete user.providers[req.params.provider];
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

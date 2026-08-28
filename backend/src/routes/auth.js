import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { mem } from "../store.js";
import { fail } from "../util.js";
import {
  clearAuthCookies,
  publicUser,
  recordSession,
  requireAuth,
  setAuthCookies,
} from "../auth.js";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(80),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const profileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  imageUrl: z.string().url().max(500).nullable().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

function issueSession(res, req, user) {
  const jti = mem.id();
  setAuthCookies(res, user, { refreshJti: jti });
  const sess = recordSession(user.id, req, jti);
  return sess;
}

authRouter.post("/register", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    if (mem.users.some((u) => u.email.toLowerCase() === body.email.toLowerCase())) {
      throw fail(409, "CONFLICT", "Email already registered");
    }
    const user = {
      id: mem.id(),
      email: body.email.toLowerCase(),
      name: body.name,
      imageUrl: null,
      passwordHash: await bcrypt.hash(body.password, 12),
      twoFactorEnabled: false,
      twoFactorSecret: null,
      providers: {},
      quotaBytes: mem.DEFAULT_QUOTA_BYTES,
      createdAt: mem.now(),
    };
    mem.users.push(user);
    issueSession(res, req, user);
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    if (err.name === "ZodError") return next(fail(400, "VALIDATION", err.errors[0]?.message ?? "Invalid payload"));
    next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = mem.users.find((u) => u.email === body.email.toLowerCase());
    if (!user || !user.passwordHash || !(await bcrypt.compare(body.password, user.passwordHash))) {
      throw fail(401, "UNAUTHENTICATED", "Invalid email or password");
    }
    if (user.twoFactorEnabled) {
      const code = String(req.body?.twoFactorCode || "");
      if (!/^\d{6}$/.test(code)) {
        return res.status(401).json({ error: { code: "TWO_FACTOR_REQUIRED", message: "Two-factor code required" } });
      }
      if (code !== (user.twoFactorSecret || "")) {
        throw fail(401, "UNAUTHENTICATED", "Invalid two-factor code");
      }
    }
    issueSession(res, req, user);
    res.json({ user: publicUser(user) });
  } catch (err) {
    if (err.name === "ZodError") return next(fail(400, "VALIDATION", err.errors[0]?.message ?? "Invalid payload"));
    next(err);
  }
});

authRouter.post("/logout", (req, res) => {
  const token = req.cookies?.refresh_token;
  if (token) {
    const data = mem.refresh.get(token);
    mem.refresh.delete(token);
    if (data?.jti) {
      const sess = mem.sessions.find((s) => s.id === data.jti);
      if (sess) sess.revokedAt = mem.now();
    }
  }
  clearAuthCookies(res);
  res.json({ ok: true });
});

authRouter.post("/refresh", (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) throw fail(401, "UNAUTHENTICATED", "Missing refresh token");
    const data = mem.refresh.get(token);
    if (!data) throw fail(401, "UNAUTHENTICATED", "Unknown refresh token");
    const payload = jwt.verify(token, process.env.REFRESH_SECRET || "dev-refresh");
    if (payload.typ !== "refresh" || payload.sub !== data.userId) {
      throw fail(401, "UNAUTHENTICATED", "Refresh token mismatch");
    }
    const user = mem.users.find((u) => u.id === payload.sub);
    if (!user) throw fail(401, "UNAUTHENTICATED", "User missing");
    // Rotate: invalidate old refresh, issue new
    mem.refresh.delete(token);
    const sess = mem.sessions.find((s) => s.id === data.jti);
    if (sess) sess.lastActiveAt = mem.now();
    issueSession(res, req, user);
    res.json({ user: publicUser(user) });
  } catch (err) {
    if (err.status) return next(err);
    next(fail(401, "UNAUTHENTICATED", "Invalid refresh token"));
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  const user = mem.users.find((u) => u.id === req.user.id);
  res.json({ user: publicUser(user) });
});

authRouter.patch("/me", requireAuth, (req, res, next) => {
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

authRouter.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const body = passwordSchema.parse(req.body);
    const user = mem.users.find((u) => u.id === req.user.id);
    if (!user || !user.passwordHash) throw fail(404, "NOT_FOUND", "User not found");
    if (!(await bcrypt.compare(body.currentPassword, user.passwordHash))) {
      throw fail(401, "UNAUTHENTICATED", "Current password incorrect");
    }
    user.passwordHash = await bcrypt.hash(body.newPassword, 12);
    // Revoke all other sessions on password change
    for (const s of mem.sessions.filter((s) => s.userId === user.id && !s.revokedAt)) {
      s.revokedAt = mem.now();
    }
    res.json({ ok: true });
  } catch (err) {
    if (err.name === "ZodError") return next(fail(400, "VALIDATION", err.errors[0]?.message ?? "Invalid payload"));
    next(err);
  }
});

// Google OAuth scaffold. In production, validate the id_token against Google's
// tokeninfo endpoint and link by `sub`. For the in-memory MVP we accept a
// verified token shape from a trusted caller (e.g. Supabase or a Google client
// that has already verified it) and create/link the user.
const googleSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120).optional(),
  imageUrl: z.string().url().optional(),
  googleSub: z.string().min(1),
});

authRouter.post("/google", (req, res, next) => {
  try {
    const body = googleSchema.parse(req.body);
    let user = mem.users.find((u) => u.providers?.google?.sub === body.googleSub);
    if (!user) user = mem.users.find((u) => u.email === body.email.toLowerCase());
    if (!user) {
      user = {
        id: mem.id(),
        email: body.email.toLowerCase(),
        name: body.name || body.email.split("@")[0],
        imageUrl: body.imageUrl || null,
        passwordHash: null,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        providers: { google: { sub: body.googleSub, email: body.email.toLowerCase() } },
        quotaBytes: mem.DEFAULT_QUOTA_BYTES,
        createdAt: mem.now(),
      };
      mem.users.push(user);
    } else {
      user.providers = { ...(user.providers || {}), google: { sub: body.googleSub, email: body.email.toLowerCase() } };
      if (body.imageUrl) user.imageUrl = body.imageUrl;
      if (body.name) user.name = body.name;
    }
    issueSession(res, req, user);
    res.json({ user: publicUser(user) });
  } catch (err) {
    if (err.name === "ZodError") return next(fail(400, "VALIDATION", err.errors[0]?.message ?? "Invalid payload"));
    next(err);
  }
});

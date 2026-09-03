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
    const existing = mem.users.find((u) => u.email.toLowerCase() === body.email.toLowerCase());
    if (existing && existing.passwordHash) {
      throw fail(409, "CONFLICT", "Email already registered");
    }
    let user;
    if (existing && !existing.passwordHash) {
      existing.name = body.name;
      existing.passwordHash = await bcrypt.hash(body.password, 12);
      user = existing;
    } else {
      user = {
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
    }
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
    const cleanEmail = body.email.toLowerCase().trim();
    const user = mem.users.find((u) => u.email.toLowerCase().trim() === cleanEmail);
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

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) throw fail(401, "UNAUTHENTICATED", "Missing refresh token");
    const payload = jwt.verify(token, process.env.REFRESH_SECRET || "dev-refresh");
    if (!payload || payload.typ !== "refresh" || !payload.sub) {
      throw fail(401, "UNAUTHENTICATED", "Invalid refresh token payload");
    }
    const user = await mem.findUser(payload.sub);
    if (!user) throw fail(401, "UNAUTHENTICATED", "User missing");
    const sess = await mem.findSession(user.id, payload.jti);
    if (sess && sess.revokedAt) {
      throw fail(401, "UNAUTHENTICATED", "Session revoked");
    }
    mem.refresh.delete(token);
    issueSession(res, req, user);
    res.json({ user: publicUser(user) });
  } catch (err) {
    if (err.status) return next(err);
    next(fail(401, "UNAUTHENTICATED", "Invalid refresh token"));
  }
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await mem.findUser(req.user.id);
  res.json({ user: publicUser(user) });
});

authRouter.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const body = profileSchema.parse(req.body);
    const user = await mem.findUser(req.user.id);
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

// ─── 2FA (TOTP) — spec §8 ───────────────────────────────────────────────────
// Two-step flow: enable → confirm → disable
const twoFactorCodeSchema = z.object({ code: z.string().regex(/^\d{6}$/) });

authRouter.post("/2fa/enable", requireAuth, async (req, res, next) => {
  try {
    const user = mem.users.find((u) => u.id === req.user.id);
    if (!user) throw fail(404, "NOT_FOUND", "User not found");
    if (user.twoFactorEnabled) {
      return res.json({ ok: true, message: "2FA is already enabled" });
    }
    // Generate a new secret (6-digit demo seed; real impl uses speakeasy/otpauth)
    const crypto = await import("node:crypto");
    const secret = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    user.twoFactorSecret = secret;
    // twoFactorEnabled stays false until /2fa/confirm
    res.json({
      ok: true,
      otpAuthUrl: `otpauth://totp/CloudFS:${user.email}?secret=${secret}&issuer=CloudFS`,
      secret,
      message: "Scan the QR code, then call /api/auth/2fa/confirm with the 6-digit code",
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/2fa/confirm", requireAuth, (req, res, next) => {
  try {
    const { code } = twoFactorCodeSchema.parse(req.body);
    const user = mem.users.find((u) => u.id === req.user.id);
    if (!user) throw fail(404, "NOT_FOUND", "User not found");
    if (user.twoFactorEnabled) {
      return res.json({ ok: true, message: "2FA is already enabled" });
    }
    if (!user.twoFactorSecret) {
      throw fail(400, "VALIDATION", "Call /api/auth/2fa/enable first to generate a secret");
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

authRouter.post("/2fa/disable", requireAuth, (req, res, next) => {
  try {
    const { code } = twoFactorCodeSchema.parse(req.body);
    const user = mem.users.find((u) => u.id === req.user.id);
    if (!user) throw fail(404, "NOT_FOUND", "User not found");
    if (!user.twoFactorEnabled) {
      return res.json({ ok: true, twoFactorEnabled: false });
    }
    if (code !== user.twoFactorSecret) {
      throw fail(400, "VALIDATION", "Invalid 2FA code");
    }
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    res.json({ ok: true, twoFactorEnabled: false });
  } catch (err) {
    if (err.name === "ZodError") return next(fail(400, "VALIDATION", err.errors[0]?.message ?? "Invalid payload"));
    next(err);
  }
});

// Google OAuth scaffold
const googleSchema = z.object({
  email: z.string().email(),
  name: z.string().max(200).optional().nullable(),
  imageUrl: z.string().max(1000).optional().nullable(),
  googleSub: z.string().min(1),
});

authRouter.post("/google", (req, res, next) => {
  const startAt = Date.now();
  
  // Wrap entire route in try/catch to prevent ANY unhandled crash
  try {
    const incoming = {
      email: req.body?.email,
      name: req.body?.name,
      imageUrl: req.body?.imageUrl,
      googleSub: req.body?.googleSub,
    };

    // 1. Validate payload
    let body;
    try {
      body = googleSchema.parse(incoming);
    } catch (zodErr) {
      console.error(`[Google OAuth] Validation failed:`, zodErr.errors);
      return res.status(400).json({ error: { code: "VALIDATION", message: "Invalid data from Google" } });
    }
    
    // 2. Find or create user
    let user;
    try {
      user = await mem.findUser(null, body.googleSub);
      if (!user) user = await mem.findUser(null, null, body.email);
    } catch (findErr) {
      console.error("[Google OAuth] Memory store search failed:", findErr);
    }
    
    const isNewUser = !user;
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
      try {
        mem.users.push(user);
      } catch (pushErr) {
        console.error("[Google OAuth] Failed to save user to store:", pushErr);
        // Don't crash, just log and continue if possible or fail gracefully
        return res.status(500).json({ error: { code: "STORAGE_ERROR", message: "Could not create user profile" } });
      }
    } else {
      // Update existing user with latest Google info
      try {
        user.providers = { ...(user.providers || {}), google: { sub: body.googleSub, email: body.email.toLowerCase() } };
        if (body.imageUrl) user.imageUrl = body.imageUrl;
        if (body.name) user.name = body.name;
      } catch (updateErr) {
        console.error("[Google OAuth] Failed to update user metadata:", updateErr);
      }
    }

    // 3. Issue session
    try {
      issueSession(res, req, user);
    } catch (sessionErr) {
      console.error("[Google OAuth] Session issuance failed:", sessionErr);
      return res.status(500).json({ error: { code: "SESSION_ERROR", message: "Failed to create your login session" } });
    }

    const durationMs = Date.now() - startAt;
    console.log(`[Google OAuth] SUCCESS ${isNewUser ? "CREATED" : "LOGGED IN"} user=${user.id} duration=${durationMs}ms`);
    
    return res.json({ user: publicUser(user) });
  } catch (criticalErr) {
    console.error(`[Google OAuth] Critical crash:`, criticalErr);
    return res.status(500).json({ error: { code: "INTERNAL_CRASH", message: "An unexpected error occurred" } });
  }
});

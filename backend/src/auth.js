import jwt from "jsonwebtoken";
import { mem } from "./store.js";
import { fail } from "./util.js";

const accessSecret = () => process.env.JWT_SECRET || "dev-access";
const refreshSecret = () => process.env.REFRESH_SECRET || "dev-refresh";

export function signAccess(user) {
  return jwt.sign({ sub: user.id, email: user.email }, accessSecret(), { expiresIn: "15m" });
}

export function signRefresh(user, jti) {
  const token = jwt.sign(
    { sub: user.id, typ: "refresh", jti: jti || mem.id() },
    refreshSecret(),
    { expiresIn: "14d" },
  );
  mem.refresh.set(token, { userId: user.id, jti: jti || token });
  return token;
}

export function setAuthCookies(res, user, meta = {}) {
  const isProd = process.env.NODE_ENV === "production";
  const common = { httpOnly: true, sameSite: "lax", secure: isProd, path: "/" };
  res.cookie("access_token", signAccess(user), { ...common, maxAge: 15 * 60 * 1000 });
  const refresh = signRefresh(user, meta.refreshJti);
  res.cookie("refresh_token", refresh, { ...common, maxAge: 14 * 24 * 60 * 60 * 1000 });
  return refresh;
}

export function clearAuthCookies(res) {
  res.clearCookie("access_token", { path: "/" });
  res.clearCookie("refresh_token", { path: "/" });
}

export function recordSession(userId, req, jti) {
  const ua = req.headers["user-agent"] || "Unknown device";
  const device = parseDevice(ua);
  const session = {
    id: jti || mem.id(),
    userId,
    device: device.label,
    os: device.os,
    browser: device.browser,
    ip: req.ip || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "",
    userAgent: ua,
    lastActiveAt: mem.now(),
    createdAt: mem.now(),
    revokedAt: null,
  };
  mem.sessions.push(session);
  // Cap to last 20 sessions per user
  const mine = mem.sessions.filter((s) => s.userId === userId && !s.revokedAt);
  if (mine.length > 20) {
    const overflow = mine.slice(0, mine.length - 20);
    for (const s of overflow) s.revokedAt = mem.now();
  }
  return session;
}

function parseDevice(ua) {
  const lc = String(ua).toLowerCase();
  let os = "Unknown";
  if (lc.includes("windows")) os = "Windows";
  else if (lc.includes("mac")) os = "macOS";
  else if (lc.includes("android")) os = "Android";
  else if (lc.includes("iphone") || lc.includes("ipad")) os = "iOS";
  else if (lc.includes("linux")) os = "Linux";
  let browser = "Browser";
  if (lc.includes("edg/")) browser = "Edge";
  else if (lc.includes("chrome/")) browser = "Chrome";
  else if (lc.includes("firefox/")) browser = "Firefox";
  else if (lc.includes("safari/") && !lc.includes("chrome")) browser = "Safari";
  return { label: `${browser} on ${os}`, os, browser };
}

export function requireAuth(req, res, next) {
  try {
    let token = req.cookies?.access_token;
    let payload = null;

    if (token) {
      try {
        payload = jwt.verify(token, accessSecret());
      } catch (e) {
        // access_token expired or invalid
        token = null;
      }
    }

    // If access token is missing or expired, try auto-refreshing via refresh_token cookie
    if (!payload) {
      const refreshToken = req.cookies?.refresh_token;
      if (refreshToken) {
        try {
          const refreshPayload = jwt.verify(refreshToken, refreshSecret());
          if (refreshPayload && refreshPayload.typ === "refresh" && refreshPayload.sub) {
            const user = mem.users.find((u) => u.id === refreshPayload.sub);
            if (user) {
              const sess = mem.sessions.find((s) => s.id === refreshPayload.jti || s.userId === user.id);
              if (!sess || !sess.revokedAt) {
                // Automatically re-issue fresh auth cookies!
                setAuthCookies(res, user, { refreshJti: refreshPayload.jti });
                req.user = { id: user.id, email: user.email, name: user.name, imageUrl: user.imageUrl };
                return next();
              }
            }
          }
        } catch (e) {
          // refresh token also invalid
        }
      }
      throw fail(401, "UNAUTHENTICATED", "Sign in required");
    }

    const user = mem.users.find((u) => u.id === payload.sub);
    if (!user) throw fail(401, "UNAUTHENTICATED", "Session user missing");
    req.user = { id: user.id, email: user.email, name: user.name, imageUrl: user.imageUrl };
    const sess = mem.sessions.find((s) => s.userId === user.id && !s.revokedAt);
    if (sess) sess.lastActiveAt = mem.now();
    next();
  } catch (err) {
    if (err.status) return next(err);
    next(fail(401, "UNAUTHENTICATED", "Invalid or expired session"));
  }
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    imageUrl: user.imageUrl ?? null,
    twoFactorEnabled: !!user.twoFactorEnabled,
    createdAt: user.createdAt,
  };
}

import jwt from "jsonwebtoken";
import { mem } from "./store.js";
import { fail } from "./util.js";

const accessSecret = () => process.env.JWT_SECRET || "dev-access";
const refreshSecret = () => process.env.REFRESH_SECRET || "dev-refresh";

export function signAccess(user) {
  return jwt.sign({ sub: user.id, email: user.email }, accessSecret(), { expiresIn: "15m" });
}

export function signRefresh(user) {
  const token = jwt.sign({ sub: user.id, typ: "refresh" }, refreshSecret(), { expiresIn: "14d" });
  mem.refresh.set(token, user.id);
  return token;
}

export function setAuthCookies(res, user) {
  const isProd = process.env.NODE_ENV === "production";
  const common = { httpOnly: true, sameSite: "lax", secure: isProd, path: "/" };
  res.cookie("access_token", signAccess(user), { ...common, maxAge: 15 * 60 * 1000 });
  res.cookie("refresh_token", signRefresh(user), { ...common, maxAge: 14 * 24 * 60 * 60 * 1000 });
}

export function clearAuthCookies(res) {
  res.clearCookie("access_token", { path: "/" });
  res.clearCookie("refresh_token", { path: "/" });
}

export function requireAuth(req, _res, next) {
  try {
    const token = req.cookies?.access_token;
    if (!token) throw fail(401, "UNAUTHENTICATED", "Sign in required");
    const payload = jwt.verify(token, accessSecret());
    const user = mem.users.find((u) => u.id === payload.sub);
    if (!user) throw fail(401, "UNAUTHENTICATED", "Session user missing");
    req.user = { id: user.id, email: user.email, name: user.name, imageUrl: user.imageUrl };
    next();
  } catch (err) {
    if (err.status) return next(err);
    next(fail(401, "UNAUTHENTICATED", "Invalid or expired session"));
  }
}

export function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, imageUrl: user.imageUrl ?? null, createdAt: user.createdAt };
}

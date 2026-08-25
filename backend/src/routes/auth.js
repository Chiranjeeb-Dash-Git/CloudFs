import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { mem } from "../store.js";
import { fail } from "../util.js";
import { clearAuthCookies, publicUser, requireAuth, setAuthCookies } from "../auth.js";

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
      createdAt: mem.now(),
    };
    mem.users.push(user);
    setAuthCookies(res, user);
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
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      throw fail(401, "UNAUTHENTICATED", "Invalid email or password");
    }
    setAuthCookies(res, user);
    res.json({ user: publicUser(user) });
  } catch (err) {
    if (err.name === "ZodError") return next(fail(400, "VALIDATION", err.errors[0]?.message ?? "Invalid payload"));
    next(err);
  }
});

authRouter.post("/logout", (req, res) => {
  const token = req.cookies?.refresh_token;
  if (token) mem.refresh.delete(token);
  clearAuthCookies(res);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, (req, res) => {
  const user = mem.users.find((u) => u.id === req.user.id);
  res.json({ user: publicUser(user) });
});

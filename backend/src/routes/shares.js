import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { mem } from "../store.js";
import { fail } from "../util.js";
import { requireAuth } from "../auth.js";
import { assertWrite, logActivity } from "../acl.js";

export const sharesRouter = Router();

sharesRouter.post("/shares", requireAuth, (req, res, next) => {
  try {
    const body = z
      .object({
        resourceType: z.enum(["file", "folder"]),
        resourceId: z.string().min(1),
        granteeUserId: z.string().min(1),
        role: z.enum(["viewer", "editor"]),
      })
      .parse(req.body);
    if (body.resourceId !== "root") assertWrite(req.user.id, body.resourceType, body.resourceId);
    const grantee = mem.users.find((u) => u.id === body.granteeUserId || u.email === body.granteeUserId.toLowerCase());
    if (!grantee) throw fail(404, "NOT_FOUND", "Grantee user not found");
    const existing = mem.shares.find(
      (s) => s.resourceType === body.resourceType && s.resourceId === body.resourceId && s.granteeUserId === grantee.id,
    );
    if (existing) {
      existing.role = body.role;
      return res.json({ share: existing });
    }
    const share = {
      id: mem.id(),
      resourceType: body.resourceType,
      resourceId: body.resourceId,
      granteeUserId: grantee.id,
      role: body.role,
      createdBy: req.user.id,
      createdAt: mem.now(),
    };
    mem.shares.push(share);
    logActivity(req.user.id, "share", body.resourceType, body.resourceId, { role: body.role });
    res.status(201).json({ share });
  } catch (err) {
    if (err.name === "ZodError") return next(fail(400, "VALIDATION", err.errors[0]?.message ?? "Invalid payload"));
    next(err);
  }
});

sharesRouter.get("/shares/:resourceType/:resourceId", requireAuth, (req, res, next) => {
  try {
    const { resourceType, resourceId } = req.params;
    if (!["file", "folder"].includes(resourceType)) throw fail(400, "VALIDATION", "Invalid resource type");
    if (resourceId !== "root") assertWrite(req.user.id, resourceType, resourceId);
    const shares = mem.shares.filter((s) => s.resourceType === resourceType && s.resourceId === resourceId);
    res.json({ shares });
  } catch (err) {
    next(err);
  }
});

sharesRouter.delete("/shares/:id", requireAuth, (req, res, next) => {
  try {
    const idx = mem.shares.findIndex((s) => s.id === req.params.id);
    if (idx === -1) throw fail(404, "NOT_FOUND", "Share not found");
    mem.shares.splice(idx, 1);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

sharesRouter.post("/link-shares", requireAuth, async (req, res, next) => {
  try {
    const body = z
      .object({
        resourceType: z.enum(["file", "folder"]),
        resourceId: z.string().min(1),
        expiresAt: z.string().datetime().optional(),
        password: z.string().min(4).optional(),
      })
      .parse(req.body);
    if (body.resourceId !== "root") assertWrite(req.user.id, body.resourceType, body.resourceId);
    const link = {
      id: mem.id(),
      resourceType: body.resourceType,
      resourceId: body.resourceId,
      token: mem.id().replace(/-/g, "") + mem.id().replace(/-/g, "").slice(0, 16),
      role: "viewer",
      passwordHash: body.password ? await bcrypt.hash(body.password, 10) : null,
      expiresAt: body.expiresAt ?? null,
      createdBy: req.user.id,
      createdAt: mem.now(),
    };
    mem.links.push(link);
    res.status(201).json({ link: { id: link.id, token: link.token, expiresAt: link.expiresAt } });
  } catch (err) {
    if (err.name === "ZodError") return next(fail(400, "VALIDATION", err.errors[0]?.message ?? "Invalid payload"));
    next(err);
  }
});

sharesRouter.get("/link/:token", async (req, res, next) => {
  try {
    const link = mem.links.find((l) => l.token === req.params.token);
    if (!link) throw fail(404, "NOT_FOUND", "Link not found");
    if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
      throw fail(410, "EXPIRED", "This link has expired");
    }
    if (link.passwordHash) {
      const password = req.query.password || req.body?.password;
      if (!password || !(await bcrypt.compare(String(password), link.passwordHash))) {
        throw fail(401, "UNAUTHENTICATED", "Password required");
      }
    }
    res.json({
      resourceType: link.resourceType,
      resourceId: link.resourceId,
      role: link.role,
    });
  } catch (err) {
    next(err);
  }
});

sharesRouter.delete("/link-shares/:id", requireAuth, (req, res, next) => {
  try {
    const idx = mem.links.findIndex((l) => l.id === req.params.id && l.createdBy === req.user.id);
    if (idx === -1) throw fail(404, "NOT_FOUND", "Link not found");
    mem.links.splice(idx, 1);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

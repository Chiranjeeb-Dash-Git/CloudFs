import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { mem } from "../store.js";
import { camelFile, camelFolder, camelShare, fail } from "../util.js";
import { requireAuth } from "../auth.js";
import { assertWrite, getFile, getFolder, logActivity } from "../acl.js";

export const sharesRouter = Router();

const shareCreateSchema = z.object({
  resourceType: z.enum(["file", "folder"]),
  resourceId: z.string().min(1),
  granteeUserId: z.string().min(1),
  role: z.enum(["viewer", "editor"]),
});

const linkCreateSchema = z.object({
  resourceType: z.enum(["file", "folder"]),
  resourceId: z.string().min(1),
  expiresAt: z.string().datetime().optional(),
  password: z.string().min(4).optional(),
});

function findGrantee(identifier) {
  if (!identifier) return null;
  const id = String(identifier).toLowerCase().trim();
  let user = (
    mem.users.find((u) => u.id === identifier) ||
    mem.users.find((u) => u.email.toLowerCase() === id) ||
    mem.users.find((u) => u.email.toLowerCase().split("@")[0] === id)
  );

  if (!user && id.includes("@")) {
    user = {
      id: mem.id(),
      email: id,
      name: id.split("@")[0],
      imageUrl: null,
      passwordHash: null,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      providers: {},
      quotaBytes: mem.DEFAULT_QUOTA_BYTES,
      createdAt: mem.now(),
    };
    mem.users.push(user);
  }
  return user;
}

function resourceSummary(share) {
  if (share.resourceType === "file") {
    const f = getFile(share.resourceId);
    return f ? { ...camelFile(f), _role: share.role } : null;
  }
  const f = getFolder(share.resourceId);
  return f ? { ...camelFolder(f), _role: share.role } : null;
}

sharesRouter.post("/shares", requireAuth, (req, res, next) => {
  try {
    const body = shareCreateSchema.parse(req.body);
    if (body.resourceId !== "root") assertWrite(req.user.id, body.resourceType, body.resourceId);
    const grantee = findGrantee(body.granteeUserId);
    if (!grantee) throw fail(404, "NOT_FOUND", "Grantee user not found");
    if (grantee.id === req.user.id) throw fail(400, "VALIDATION", "Cannot share with yourself");
    const existing = mem.shares.find(
      (s) => s.resourceType === body.resourceType && s.resourceId === body.resourceId && s.granteeUserId === grantee.id,
    );
    if (existing) {
      existing.role = body.role;
      return res.json({ share: camelShare(existing) });
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
    logActivity(req.user.id, "share", body.resourceType, body.resourceId, {
      role: body.role,
      grantee: grantee.email,
    });
    // Notify grantee
    mem.notifications.push({
      id: mem.id(),
      userId: grantee.id,
      type: "share",
      title: `${mem.users.find((u) => u.id === req.user.id)?.name || "Someone"} shared a ${body.resourceType} with you`,
      body: `You now have ${body.role} access.`,
      link: body.resourceType === "file" ? `/files?open=${body.resourceId}` : `/files?folder=${body.resourceId}`,
      readAt: null,
      createdAt: mem.now(),
    });
    res.status(201).json({ share: camelShare(share) });
  } catch (err) {
    if (err.name === "ZodError") return next(fail(400, "VALIDATION", err.errors[0]?.message ?? "Invalid payload"));
    next(err);
  }
});

// "Shared with me" — items others have shared to the current user
// (must be registered before /shares/:resourceType/:resourceId so "inbox" is
// matched as a literal segment, not as a resourceType param)
sharesRouter.get("/shares/inbox", requireAuth, (req, res) => {
  const myShares = mem.shares.filter((s) => s.granteeUserId === req.user.id);
  const items = myShares
    .map((s) => {
      const summary = resourceSummary(s);
      if (!summary) return null;
      const owner = mem.users.find((u) => u.id === summary.ownerId);
      return {
        ...summary,
        shareId: s.id,
        role: s.role,
        owner: owner ? { id: owner.id, email: owner.email, name: owner.name } : null,
        createdAt: s.createdAt,
      };
    })
    .filter(Boolean);
  res.json({ items });
});

// "Shared by me" — items the current user has shared to others
sharesRouter.get("/shares/outbox", requireAuth, (req, res) => {
  const myShares = mem.shares.filter((s) => s.createdBy === req.user.id);
  const items = myShares
    .map((s) => {
      const grantee = mem.users.find((u) => u.id === s.granteeUserId);
      const summary = resourceSummary(s);
      if (!summary) return null;
      return {
        ...summary,
        shareId: s.id,
        role: s.role,
        grantee: grantee ? { id: grantee.id, email: grantee.email, name: grantee.name } : null,
        createdAt: s.createdAt,
      };
    })
    .filter(Boolean);
  res.json({ items });
});

sharesRouter.get("/shares/:resourceType/:resourceId", requireAuth, (req, res, next) => {
  try {
    const { resourceType, resourceId } = req.params;
    if (!["file", "folder"].includes(resourceType)) throw fail(400, "VALIDATION", "Invalid resource type");
    if (resourceId !== "root") assertWrite(req.user.id, resourceType, resourceId);
    const shares = mem.shares
      .filter((s) => s.resourceType === resourceType && s.resourceId === resourceId)
      .map((s) => {
        const grantee = mem.users.find((u) => u.id === s.granteeUserId);
        return {
          ...camelShare(s),
          grantee: grantee ? { id: grantee.id, email: grantee.email, name: grantee.name } : null,
        };
      });
    res.json({ shares });
  } catch (err) {
    next(err);
  }
});

sharesRouter.delete("/shares/:id", requireAuth, (req, res, next) => {
  try {
    const idx = mem.shares.findIndex((s) => s.id === req.params.id);
    if (idx === -1) throw fail(404, "NOT_FOUND", "Share not found");
    const share = mem.shares[idx];
    const ownsResource =
      (share.resourceType === "file" ? getFile(share.resourceId) : getFolder(share.resourceId))?.ownerId === req.user.id;
    if (!ownsResource && share.createdBy !== req.user.id) {
      throw fail(403, "FORBIDDEN", "Cannot revoke this share");
    }
    mem.shares.splice(idx, 1);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

sharesRouter.post("/link-shares", requireAuth, async (req, res, next) => {
  try {
    const body = linkCreateSchema.parse(req.body);
    if (body.resourceId !== "root") assertWrite(req.user.id, body.resourceType, body.resourceId);
    const token = mem.id().replace(/-/g, "") + mem.id().replace(/-/g, "").slice(0, 16);
    const link = {
      id: mem.id(),
      resourceType: body.resourceType,
      resourceId: body.resourceId,
      token,
      role: "viewer",
      passwordHash: body.password ? await bcrypt.hash(body.password, 10) : null,
      expiresAt: body.expiresAt ?? null,
      createdBy: req.user.id,
      createdAt: mem.now(),
    };
    mem.links.push(link);
    res.status(201).json({
      link: {
        id: link.id,
        token: link.token,
        expiresAt: link.expiresAt,
        hasPassword: !!link.passwordHash,
        url: `/link/${link.token}`,
      },
    });
  } catch (err) {
    if (err.name === "ZodError") return next(fail(400, "VALIDATION", err.errors[0]?.message ?? "Invalid payload"));
    next(err);
  }
});

sharesRouter.get("/links", requireAuth, (req, res) => {
  // List link-shares for resources owned by current user
  const owned = new Set(
    mem.files
      .filter((f) => f.ownerId === req.user.id)
      .map((f) => `file:${f.id}`),
  );
  for (const f of mem.folders.filter((f) => f.ownerId === req.user.id)) {
    owned.add(`folder:${f.id}`);
  }
  const links = mem.links
    .filter((l) => owned.has(`${l.resourceType}:${l.resourceId}`))
    .map((l) => ({
      id: l.id,
      resourceType: l.resourceType,
      resourceId: l.resourceId,
      token: l.token,
      expiresAt: l.expiresAt,
      hasPassword: !!l.passwordHash,
      createdAt: l.createdAt,
      url: `/link/${l.token}`,
    }));
  res.json({ links });
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
    const resource =
      link.resourceType === "file" ? getFile(link.resourceId) : getFolder(link.resourceId);
    if (!resource) throw fail(404, "NOT_FOUND", "Resource missing");
    const owner = mem.users.find((u) => u.id === resource.ownerId);
    res.json({
      resourceType: link.resourceType,
      resourceId: link.resourceId,
      role: link.role,
      resource: link.resourceType === "file" ? camelFile(resource) : camelFolder(resource),
      owner: owner ? { id: owner.id, name: owner.name, email: owner.email } : null,
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

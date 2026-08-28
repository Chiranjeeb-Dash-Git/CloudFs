import crypto from "node:crypto";

export function fail(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

export function sendError(res, err) {
  const status = err.status ?? 500;
  res.status(status).json({
    error: { code: err.code ?? "INTERNAL", message: err.message ?? "Unexpected error" },
  });
}

export function camelFile(row) {
  return {
    id: row.id,
    name: row.name,
    mimeType: row.mime_type ?? row.mimeType,
    sizeBytes: row.size_bytes ?? row.sizeBytes ?? 0,
    storageKey: row.storage_key ?? row.storageKey,
    ownerId: row.owner_id ?? row.ownerId,
    folderId: row.folder_id ?? row.folderId ?? null,
    checksum: row.checksum ?? null,
    status: row.status ?? "ready",
    isDeleted: row.is_deleted ?? row.isDeleted ?? false,
    deletedAt: row.deletedAt ?? null,
    versionId: row.versionId ?? row.version_id ?? null,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  };
}

export function camelFolder(row) {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id ?? row.ownerId,
    parentId: row.parent_id ?? row.parentId ?? null,
    isDeleted: row.is_deleted ?? row.isDeleted ?? false,
    deletedAt: row.deletedAt ?? null,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  };
}

export function camelShare(row) {
  return {
    id: row.id,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    granteeUserId: row.granteeUserId,
    role: row.role,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}

export function slugName(name) {
  return (
    String(name)
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "file"
  );
}

export function sanitizeFilename(name) {
  return String(name).replace(/[/\\]/g, "_").replace(/[\x00-\x1f]/g, "").slice(0, 220);
}

export function signedUrlToken(storageKey, ttlMs = 60_000) {
  const secret = process.env.URL_SIGNING_SECRET || process.env.JWT_SECRET || "dev-url-sign";
  const exp = Date.now() + ttlMs;
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${storageKey}:${exp}`)
    .digest("hex")
    .slice(0, 32);
  return { exp, sig };
}

export function verifySignedUrlToken(storageKey, exp, sig) {
  const secret = process.env.URL_SIGNING_SECRET || process.env.JWT_SECRET || "dev-url-sign";
  if (!exp || !sig) return false;
  if (Number(exp) < Date.now()) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${storageKey}:${exp}`)
    .digest("hex")
    .slice(0, 32);
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

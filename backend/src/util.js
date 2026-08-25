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
    sizeBytes: row.size_bytes ?? row.sizeBytes,
    storageKey: row.storage_key ?? row.storageKey,
    ownerId: row.owner_id ?? row.ownerId,
    folderId: row.folder_id ?? row.folderId ?? null,
    checksum: row.checksum ?? null,
    status: row.status ?? "ready",
    isDeleted: row.is_deleted ?? row.isDeleted ?? false,
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
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  };
}

export function slugName(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "file";
}

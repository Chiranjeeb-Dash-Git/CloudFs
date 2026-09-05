import crypto from "node:crypto";

export function fail(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

export function sendError(res, err) {
  console.error("[API ERROR UNHANDLED]", err);
  const status = err?.status ?? 500;
  res.status(status).json({
    error: {
      code: err?.code ?? "INTERNAL",
      message: err?.message ?? "Unexpected error",
      stack: err?.stack ?? String(err)
    },
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

export function startTrashPurgeInterval() {
  const TRASH_RETENTION_DAYS = 30;
  const daysSince = (iso) => {
    if (!iso) return 0;
    return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
  };

  const purge = async () => {
    try {
      const { mem } = await import("./store.js");
      const { storageDir } = await import("./config.js");
      const fs = await import("node:fs");
      const path = await import("node:path");

      let purgedFiles = 0;
      let purgedFolders = 0;

      // Purge folders
      for (let i = mem.folders.length - 1; i >= 0; i--) {
        const folder = mem.folders[i];
        if (folder.isDeleted && daysSince(folder.deletedAt) > TRASH_RETENTION_DAYS) {
          mem.folders.splice(i, 1);
          purgedFolders++;
        }
      }

      // Purge files
      for (let i = mem.files.length - 1; i >= 0; i--) {
        const file = mem.files[i];
        if (file.isDeleted && daysSince(file.deletedAt) > TRASH_RETENTION_DAYS) {
          mem.files.splice(i, 1);
          purgedFiles++;

          const dest = path.join(storageDir, file.id);
          if (fs.existsSync(dest)) {
            try {
              fs.unlinkSync(dest);
            } catch (err) {
              // Ignore or log error
            }
          }
        }
      }

      if (purgedFiles > 0 || purgedFolders > 0) {
        console.log(`[Trash Purge] Purged ${purgedFiles} files and ${purgedFolders} folders past ${TRASH_RETENTION_DAYS}-day retention.`);
      }
    } catch (err) {
      console.error("[Trash Purge] Error running purge job:", err);
    }
  };

  // Run initial purge, then schedule every 12 hours
  purge();
  setInterval(purge, 12 * 60 * 60 * 1000);
}

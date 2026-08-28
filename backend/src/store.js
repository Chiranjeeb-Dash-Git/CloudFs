import { randomUUID } from "node:crypto";

const now = () => new Date().toISOString();
const DEFAULT_QUOTA_BYTES = 15 * 1024 * 1024 * 1024; // 15 GB

export function createMemoryStore() {
  const users = []; // { id, email, name, imageUrl, passwordHash, twoFactorEnabled, twoFactorSecret, createdAt, providers: {google: {sub, email}}, quotaBytes }
  const folders = []; // { id, name, ownerId, parentId, isDeleted, deletedAt, createdAt, updatedAt }
  const files = []; // { id, name, mimeType, sizeBytes, storageKey, ownerId, folderId, versionId, checksum, status, isDeleted, deletedAt, createdAt, updatedAt }
  const versions = []; // { id, fileId, versionNumber, storageKey, sizeBytes, checksum, createdAt }
  const shares = []; // { id, resourceType, resourceId, granteeUserId, role, createdBy, createdAt }
  const links = []; // { id, resourceType, resourceId, token, role, passwordHash, expiresAt, createdBy, createdAt }
  const stars = []; // { userId, resourceType, resourceId, createdAt }
  const activities = []; // { id, actorId, action, resourceType, resourceId, context, createdAt }
  const refresh = new Map(); // token -> userId
  const sessions = []; // { id, userId, device, ip, userAgent, lastActiveAt, createdAt, current }
  const settings = []; // { userId, plan, notifications: {email, share, security}, updatedAt }
  const notifications = []; // { id, userId, type, title, body, link, readAt, createdAt }

  function getOrCreateSettings(userId) {
    let s = settings.find((x) => x.userId === userId);
    if (!s) {
      s = {
        userId,
        plan: "free",
        notifications: { email: true, share: true, security: true },
        updatedAt: now(),
      };
      settings.push(s);
    }
    return s;
  }

  function storageUsed(userId) {
    return files
      .filter((f) => f.ownerId === userId && !f.isDeleted)
      .reduce((sum, f) => sum + Number(f.sizeBytes || 0), 0);
  }

  function quotaFor(userId) {
    const u = users.find((x) => x.id === userId);
    return Number(u?.quotaBytes ?? DEFAULT_QUOTA_BYTES);
  }

  return {
    users,
    folders,
    files,
    versions,
    shares,
    links,
    stars,
    activities,
    refresh,
    sessions,
    settings,
    notifications,
    id: () => randomUUID(),
    now,
    getOrCreateSettings,
    storageUsed,
    quotaFor,
    DEFAULT_QUOTA_BYTES,
  };
}

export const mem = createMemoryStore();

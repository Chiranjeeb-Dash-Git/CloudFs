import { mem } from "./store.js";
import { fail } from "./util.js";

function owns(userId, resource) {
  return resource && resource.ownerId === userId;
}

function shareRole(userId, type, id) {
  return mem.shares.find((s) => s.granteeUserId === userId && s.resourceType === type && s.resourceId === id)?.role;
}

export function getFolder(id) {
  return mem.folders.find((f) => f.id === id);
}

export function getFile(id) {
  return mem.files.find((f) => f.id === id);
}

export function canRead(userId, type, id) {
  const resource = type === "folder" ? getFolder(id) : getFile(id);
  if (!resource || resource.isDeleted) return false;
  if (owns(userId, resource)) return true;
  if (shareRole(userId, type, id)) return true;
  if (type === "file" && resource.folderId) return canRead(userId, "folder", resource.folderId);
  if (type === "folder" && resource.parentId) return canRead(userId, "folder", resource.parentId);
  return false;
}

export function canWrite(userId, type, id) {
  const resource = type === "folder" ? getFolder(id) : getFile(id);
  if (!resource || resource.isDeleted) return false;
  if (owns(userId, resource)) return true;
  if (shareRole(userId, type, id) === "editor") return true;
  if (type === "file" && resource.folderId) return canWrite(userId, "folder", resource.folderId);
  if (type === "folder" && resource.parentId) return canWrite(userId, "folder", resource.parentId);
  return false;
}

export function assertRead(userId, type, id) {
  if (!canRead(userId, type, id)) throw fail(403, "FORBIDDEN", "You do not have access to this resource");
}

export function assertWrite(userId, type, id) {
  if (!canWrite(userId, type, id)) throw fail(403, "FORBIDDEN", "Editor or owner role required");
}

export function folderPath(folderId) {
  const path = [];
  let current = folderId ? getFolder(folderId) : null;
  const guard = new Set();
  while (current && !guard.has(current.id)) {
    guard.add(current.id);
    path.unshift(current);
    current = current.parentId ? getFolder(current.parentId) : null;
  }
  return path;
}

export function logActivity(actorId, action, resourceType, resourceId, context = {}) {
  mem.activities.unshift({
    id: mem.id(),
    actorId,
    action,
    resourceType,
    resourceId,
    context,
    createdAt: mem.now(),
  });
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export type ApiError = { error: { code: string; message: string } };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  const data = (await res.json().catch(() => ({}))) as T & ApiError;
  if (!res.ok) {
    const message = data?.error?.message ?? `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  me: () => request<{ user: { id: string; email: string; name: string; imageUrl?: string } }>("/api/auth/me"),
  register: (body: { email: string; password: string; name: string }) =>
    request("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  file: (id: string) =>
    request<{ file: DriveFile; signedUrl: string }>(`/api/files/${id}`),
  folder: (id: string) =>
    request<{
      folder: DriveFolder | null;
      children: { folders: DriveFolder[]; files: DriveFile[] };
      path: DriveFolder[];
    }>(`/api/folders/${id}`),
  createFolder: (body: { name: string; parentId: string | null }) =>
    request<{ folder: DriveFolder }>("/api/folders", { method: "POST", body: JSON.stringify(body) }),
  search: (q: string) =>
    request<{ results: Array<DriveFile | DriveFolder> }>(`/api/search?q=${encodeURIComponent(q)}`),
  trash: () => request<{ items: Array<DriveFile | DriveFolder> }>("/api/trash"),
  restore: (body: { resourceType: "file" | "folder"; resourceId: string }) =>
    request("/api/trash/restore", { method: "POST", body: JSON.stringify(body) }),
  shares: (type: string, id: string) => request<{ shares: ShareRow[] }>(`/api/shares/${type}/${id}`),
  createShare: (body: { resourceType: string; resourceId: string; granteeUserId: string; role: string }) =>
    request("/api/shares", { method: "POST", body: JSON.stringify(body) }),
  createLink: (body: { resourceType: string; resourceId: string; expiresAt?: string; password?: string }) =>
    request<{ link: { token: string } }>("/api/link-shares", { method: "POST", body: JSON.stringify(body) }),
  uploadInit: (body: { name: string; mimeType: string; sizeBytes: number; folderId: string | null }) =>
    request<{ fileId: string; upload: { method: string; url?: string; parts?: { partNumber: number; url: string }[] } }>(
      "/api/files/init",
      { method: "POST", body: JSON.stringify(body) },
    ),
  uploadComplete: (body: { fileId: string; parts?: { partNumber: number; etag: string }[] }) =>
    request("/api/files/complete", { method: "POST", body: JSON.stringify(body) }),
  storage: () =>
    request<{
      usedBytes: number;
      quotaBytes: number;
      freeBytes: number;
      percentUsed: number;
      fileCount: number;
      folderCount: number;
      sharedCount: number;
    }>("/api/me/storage"),
  recent: () => request<{ items: DriveFile[] }>("/api/files/recent"),
  deleteFile: (id: string) => request<any>(`/api/files/${id}`, { method: "DELETE" }),
  deleteFolder: (id: string) => request<any>(`/api/folders/${id}`, { method: "DELETE" }),
  stars: () => request<{ items: Array<{ resourceType: "file" | "folder"; resourceId: string; resource: DriveFile | DriveFolder }> }>("/api/stars"),
  addStar: (body: { resourceType: "file" | "folder"; resourceId: string }) =>
    request("/api/stars", { method: "POST", body: JSON.stringify(body) }),
  removeStar: (body: { resourceType: "file" | "folder"; resourceId: string }) =>
    request("/api/stars", { method: "DELETE", body: JSON.stringify(body) }),
  updateProfile: (body: { name?: string; imageUrl?: string | null }) =>
    request<{ user: { id: string; email: string; name: string; imageUrl?: string } }>("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getNotifications: () =>
    request<{ notifications: { email: boolean; share: boolean; security: boolean } }>("/api/users/me/notifications"),
  updateNotifications: (body: { email?: boolean; share?: boolean; security?: boolean }) =>
    request<{ notifications: { email: boolean; share: boolean; security: boolean } }>("/api/users/me/notifications", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteAllSessions: () =>
    request("/api/sessions", { method: "DELETE" }),
};

export type DriveFolder = {
  id: string;
  name: string;
  ownerId: string;
  parentId: string | null;
  createdAt: string;
};

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  ownerId: string;
  folderId: string | null;
  createdAt: string;
};

export type ShareRow = {
  id: string;
  role: "viewer" | "editor";
  granteeUserId: string;
};

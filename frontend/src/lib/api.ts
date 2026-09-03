const API_BASE = ""; // Relative path to use Next.js proxy (fixes cookie issues for cross-origin media)

export type ApiError = { error: { code: string; message: string } };

async function request<T>(path: string, init?: RequestInit, isRetry = false): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  if (res.status === 401 && !isRetry && !path.includes("/login") && !path.includes("/register") && !path.includes("/refresh")) {
    try {
      const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshRes.ok) {
        return request<T>(path, init, true);
      }
    } catch {
      // Ignore
    }
  }

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
      plan: string;
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
  renameFile: (id: string, name: string) =>
    request<{ file: DriveFile }>(`/api/files/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  moveFile: (id: string, folderId: string | null) =>
    request<{ file: DriveFile }>(`/api/files/${id}`, { method: "PATCH", body: JSON.stringify({ folderId }) }),
  renameFolder: (id: string, name: string) =>
    request<{ folder: DriveFolder }>(`/api/folders/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  moveFolder: (id: string, parentId: string | null) =>
    request<{ folder: DriveFolder }>(`/api/folders/${id}`, { method: "PATCH", body: JSON.stringify({ parentId }) }),
  folderTree: () =>
    request<{ folders: DriveFolder[] }>("/api/folders/tree"),
  deleteShare: (id: string) =>
    request(`/api/shares/${id}`, { method: "DELETE" }),
  sharesInbox: () =>
    request<{ items: (DriveFile | DriveFolder)[] }>("/api/shares/inbox"),
  sharesOutbox: () =>
    request<{ items: any[] }>("/api/shares/outbox"),
  linksList: () =>
    request<{ links: any[] }>("/api/links"),
  deleteLink: (id: string) =>
    request(`/api/link-shares/${id}`, { method: "DELETE" }),
  downloadUrl: (id: string) => `/api/files/${id}/download`,
  thumbnailUrl: (id: string) => `/api/files/${id}/thumbnail`,
  publicDownloadUrl: (id: string, token: string, password?: string) => {
    const params = new URLSearchParams({ token });
    if (password) params.set("password", password);
    return `/api/files/${id}/public-download?${params.toString()}`;
  },
  searchAdvanced: (params: { q?: string; type?: string; owner?: string; sort?: string; order?: string }) => {
    const query = new URLSearchParams();
    if (params.q) query.append("q", params.q);
    if (params.type && params.type !== "all") query.append("type", params.type);
    if (params.owner && params.owner !== "all") query.append("owner", params.owner);
    if (params.sort) query.append("sort", params.sort);
    if (params.order) query.append("order", params.order);
    return request<{ results: Array<DriveFile | DriveFolder> }>(`/api/search?${query.toString()}`);
  },
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

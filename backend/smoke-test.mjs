// Comprehensive backend smoke test
const BASE = "http://localhost:8080";
const TAG = Date.now().toString(36);

let cookie1 = "";
let cookie2 = "";
let user1, user2, fileId, folderId, linkToken, shareId;

function jar(headers) {
  if (!headers) return "";
  // Robust cookie parser — handles both `getSetCookie()` (Node 19.7+) and the
  // older `raw()` header iteration. Combines all Set-Cookie values.
  const set =
    (typeof headers.getSetCookie === "function" && headers.getSetCookie()) ||
    (headers.raw?.()?.["set-cookie"] || []);
  return set.map((c) => c.split(";")[0]).join("; ");
}
async function jget(path, jarStr = "") {
  const r = await fetch(`${BASE}${path}`, { headers: { Cookie: jarStr } });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
async function jpost(path, body, jarStr = "") {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: jarStr },
    body: JSON.stringify(body),
  });
  return { status: r.status, headers: r.headers, body: await r.json().catch(() => ({})) };
}
async function jpatch(path, body, jarStr = "") {
  const r = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: jarStr },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
async function jdelete(path, jarStr = "") {
  const r = await fetch(`${BASE}${path}`, { method: "DELETE", headers: { Cookie: jarStr } });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

function assert(cond, label) {
  if (cond) {
    console.log(`OK   ${label}`);
  } else {
    console.log(`FAIL ${label}`);
    process.exitCode = 1;
  }
}

async function run() {
  // 1. Register two users
  const r1 = await jpost("/api/auth/register", {
    email: `alice-${TAG}@example.com`,
    password: "supersecret1",
    name: "Alice",
  });
  cookie1 = jar(r1.headers);
  user1 = r1.body.user;
  assert(r1.status === 201 && r1.body.user?.email === `alice-${TAG}@example.com`, "register alice");

  const r2 = await jpost("/api/auth/register", {
    email: `bob-${TAG}@example.com`,
    password: "supersecret2",
    name: "Bob",
  });
  cookie2 = jar(r2.headers);
  user2 = r2.body.user;
  assert(r2.status === 201 && r2.body.user?.email === `bob-${TAG}@example.com`, "register bob");

  // 2. Refresh
  const rr = await jpost("/api/auth/refresh", {}, cookie1);
  cookie1 = jar(rr.headers);
  assert(rr.status === 200 && rr.body.user?.id === user1.id, "refresh tokens");

  // 3. /me + patch profile
  const me = await jget("/api/auth/me", cookie1);
  assert(me.status === 200 && me.body.user?.email === `alice-${TAG}@example.com`, "GET /me");
  const mePatch = await jpatch("/api/auth/me", { name: "Alice Updated" }, cookie1);
  assert(mePatch.status === 200 && mePatch.body.user?.name === "Alice Updated", "PATCH /me");

  // 4. Storage usage
  const su = await jget("/api/me/storage", cookie1);
  assert(su.status === 200 && su.body.quotaBytes > 0 && su.body.fileCount === 0, "GET /me/storage");

  // 5. Create folder
  const f = await jpost("/api/folders", { name: "Documents" }, cookie1);
  folderId = f.body.folder.id;
  assert(f.status === 201 && f.body.folder?.name === "Documents", "create folder");

  // 6. Folder tree
  const tree = await jget("/api/folders/tree", cookie1);
  assert(tree.status === 200 && tree.body.tree?.length === 1, "folder tree");

  // 7. Init + upload + complete
  const init = await jpost(
    "/api/files/init",
    { name: "hello.txt", mimeType: "text/plain", sizeBytes: 12, folderId },
    cookie1,
  );
  fileId = init.body.fileId;
  assert(init.status === 201 && init.body.upload?.url, "init upload");

  const put = await fetch(`${BASE}/api/files/${fileId}/bytes`, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream", Cookie: cookie1 },
    body: Buffer.from("Hello world!"),
  });
  assert(put.status === 200, "upload bytes");

  const comp = await jpost("/api/files/complete", { fileId }, cookie1);
  assert(comp.status === 200 && comp.body.file?.status === "ready", "complete upload");

  // 8. Recent + starred
  const recent = await jget("/api/files/recent", cookie1);
  assert(recent.status === 200 && recent.body.items?.length >= 1, "recent files");

  const star = await jpost("/api/stars", { resourceType: "file", resourceId: fileId }, cookie1);
  assert(star.status === 201, "star file");
  const starred = await jget("/api/files/starred", cookie1);
  assert(starred.status === 200 && starred.body.files?.length >= 1, "starred list");

  // 9. Share with bob (user)
  const sh = await jpost(
    "/api/shares",
    { resourceType: "file", resourceId: fileId, granteeUserId: `bob-${TAG}@example.com`, role: "viewer" },
    cookie1,
  );
  shareId = sh.body.share?.id;
  assert(sh.status === 201 && sh.body.share?.granteeUserId === user2.id, "create share");

  // 10. Inbox (bob should see alice's file)
  const inbox = await jget("/api/shares/inbox", cookie2);
  assert(inbox.status === 200 && inbox.body.items?.length >= 1, "shared with me");

  // 11. Outbox (alice)
  const outbox = await jget("/api/shares/outbox", cookie1);
  assert(outbox.status === 200 && outbox.body.items?.length >= 1, "shared by me");

  // 12. Public link
  const link = await jpost(
    "/api/link-shares",
    { resourceType: "file", resourceId: fileId, password: "secret123" },
    cookie1,
  );
  linkToken = link.body.link?.token;
  assert(link.status === 201 && linkToken, "create link share");
  const linkList = await jget("/api/links", cookie1);
  assert(linkList.status === 200 && linkList.body.links?.length >= 1, "list link shares");
  const linkResolve = await jget(`/api/link/${linkToken}?password=secret123`);
  assert(linkResolve.status === 200 && linkResolve.body.resourceType === "file", "resolve link with password");

  // 13. Search
  const sr = await jget("/api/search?q=hello", cookie1);
  assert(sr.status === 200 && sr.body.results?.length >= 1, "search");

  // 14. Versions
  const v = await jget(`/api/files/${fileId}/versions`, cookie1);
  assert(v.status === 200 && v.body.versions?.length >= 1, "list versions");

  // 15. Thumbnail (text file → placeholder JSON)
  const thumb = await jget(`/api/files/${fileId}/thumbnail`, cookie1);
  assert(thumb.status === 200, "thumbnail descriptor");

  // 16. Trash flow
  const del = await jdelete(`/api/files/${fileId}`, cookie1);
  assert(del.status === 200, "soft delete file");
  const trash = await jget("/api/trash", cookie1);
  assert(trash.status === 200 && trash.body.items?.length >= 1, "trash list");
  const restore = await jpost("/api/trash/restore", { resourceType: "file", resourceId: fileId }, cookie1);
  assert(restore.status === 200, "restore from trash");
  // Soft-delete + permanent delete
  await jdelete(`/api/files/${fileId}`, cookie1);
  const perm = await jdelete(`/api/trash/file/${fileId}`, cookie1);
  assert(perm.status === 200, "permanent delete from trash");

  // 17. Sessions
  const sess = await jget("/api/sessions", cookie1);
  assert(sess.status === 200 && sess.body.items?.length >= 1, "list sessions");
  const meId = sess.body.items.find((s) => s.current)?.id;

  // Test DELETE /api/sessions (revoke others)
  const revokeAllOthers = await jdelete("/api/sessions", cookie1);
  assert(revokeAllOthers.status === 200 && revokeAllOthers.body.ok === true, "DELETE /api/sessions (revoke others)");

  await jdelete(`/api/sessions/${meId}`, cookie1); // revoke current — should clear cookie too
  // Restore by re-login
  const loginAgain = await jpost(
    "/api/auth/login",
    { email: `alice-${TAG}@example.com`, password: "supersecret1" },
    "",
  );
  cookie1 = jar(loginAgain.headers);
  assert(loginAgain.status === 200, "re-login after revoke");

  // Test 2FA flow at /api/auth/2fa/*
  const enable2FA = await jpost("/api/auth/2fa/enable", {}, cookie1);
  assert(enable2FA.status === 200 && enable2FA.body.secret, "2FA enable (generate secret)");
  const totpSecret = enable2FA.body.secret;

  const confirm2FAWrong = await jpost("/api/auth/2fa/confirm", { code: "000000" }, cookie1);
  assert(confirm2FAWrong.status === 400, "2FA confirm with wrong code fails");

  const confirm2FACorrect = await jpost("/api/auth/2fa/confirm", { code: totpSecret }, cookie1);
  assert(confirm2FACorrect.status === 200 && confirm2FACorrect.body.twoFactorEnabled === true, "2FA confirm with correct code succeeds");

  const disable2FA = await jpost("/api/auth/2fa/disable", { code: totpSecret }, cookie1);
  assert(disable2FA.status === 200 && disable2FA.body.twoFactorEnabled === false, "2FA disable succeeds");

  // Test OAuth connections
  const oauthConn = await jget("/api/oauth/connections", cookie1);
  assert(oauthConn.status === 200 && Array.isArray(oauthConn.body.connections), "GET /api/oauth/connections");

  // Test Users settings / profile / plan
  const patchUserMe = await jpatch("/api/users/me", { name: "Alice Spec-Compliant" }, cookie1);
  assert(patchUserMe.status === 200 && patchUserMe.body.user?.name === "Alice Spec-Compliant", "PATCH /api/users/me");

  const getUserNotifs = await jget("/api/users/me/notifications", cookie1);
  assert(getUserNotifs.status === 200 && getUserNotifs.body.notifications, "GET /api/users/me/notifications");

  const patchUserNotifs = await jpatch("/api/users/me/notifications", { email: false }, cookie1);
  assert(patchUserNotifs.status === 200 && patchUserNotifs.body.notifications?.email === false, "PATCH /api/users/me/notifications");

  const getUserPlan = await jget("/api/users/me/plan", cookie1);
  assert(getUserPlan.status === 200 && getUserPlan.body.plan === "free", "GET /api/users/me/plan");

  // 18. Activities
  const acts = await jget("/api/activities", cookie1);
  assert(acts.status === 200 && acts.body.items?.length >= 1, "activity log");

  // 19. Settings
  const st = await jget("/api/settings", cookie1);
  assert(st.status === 200 && st.body.settings?.plan === "free", "get settings");
  const stp = await jpatch("/api/settings", { plan: "pro" }, cookie1);
  assert(stp.status === 200 && stp.body.settings?.plan === "pro", "update settings");

  // 20. Notifications (alice shared with bob; bob got one)
  const notif = await jget("/api/notifications", cookie2);
  assert(notif.status === 200 && notif.body.unread >= 1, "bob got share notification");

  // 21. Users search
  const us = await jget(`/api/users/search?q=ali`, cookie2);
  assert(us.status === 200 && us.body.users?.some((u) => u.email === `alice-${TAG}@example.com`), "user search");

  // 22. Bulk delete folders
  const f2 = await jpost("/api/folders", { name: "BulkTest" }, cookie1);
  const bulk = await jpost(
    "/api/folders/bulk",
    { ids: [f2.body.folder.id], action: "delete" },
    cookie1,
  );
  assert(bulk.status === 200 && bulk.body.results?.ok === 1, "bulk delete");

  // 23. Quota enforcement — temporarily lower quota, try to upload > quota
  await jpost("/api/me/storage/quota", { quotaBytes: 10 }, cookie1);
  const over = await jpost(
    "/api/files/init",
    { name: "huge.bin", mimeType: "application/octet-stream", sizeBytes: 999, folderId: null },
    cookie1,
  );
  assert(over.status === 413, "quota enforced");

  console.log("\n=== Smoke test complete ===");
}

run().catch((e) => {
  console.error("ERR", e);
  process.exit(1);
});

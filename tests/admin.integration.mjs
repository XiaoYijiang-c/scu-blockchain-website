// Run against a local Cloudflare server only. Credentials come from an ignored file.
// Creates uniquely named fixtures and a cleanup SQL file; never targets production.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
const base = process.env.ADMIN_TEST_URL || "http://127.0.0.1:4323";
if (new URL(base).hostname !== "127.0.0.1")
  throw new Error("Local integration test only");
const credentials = JSON.parse(
  readFileSync("output/playwright/admin-test-credentials.json", "utf8"),
);
let cookie = "";
const id = crypto.randomUUID();
writeFileSync(
  "output/playwright/admin-test-cleanup.sql",
  `DELETE FROM content WHERE id='${id}';\n`,
);
const post = (path, data, authenticated = true, origin = base) =>
  fetch(base + "/api/admin/" + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      ...(authenticated ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(data),
  });
assert.equal((await fetch(base + "/api/admin/records")).status, 401);
assert.equal(
  (await post("login", credentials, false, "https://evil.example")).status,
  403,
);
assert.equal(
  (await post("login", { ...credentials, password: "wrong" }, false)).status,
  401,
);
const login = await post("login", credentials, false);
assert.equal(login.status, 200, await login.text());
cookie = login.headers.get("set-cookie").split(";")[0];
const before = await (await fetch(base + "/")).text();
const name = "本地验证活动-" + id;
const data = {
  title: name,
  category: "功能验证",
  date: "2026-10-27",
  summary: "本地集成测试，结束后清理",
  body: "仅供测试",
  url: "",
};
const save = (action, revision, content = data) =>
  post("save", { kind: "event", id, revision, action, data: content });
let response = await save("draft", 0);
assert.equal(response.status, 200, await response.text());
assert.equal((await (await fetch(base + "/")).text()).includes(name), false);
response = await save("publish", 1);
assert.equal(response.status, 200, await response.text());
assert.equal((await (await fetch(base + "/")).text()).includes(name), true);
response = await save("draft", 2, { ...data, title: name + "-未发布修改" });
assert.equal(response.status, 200, await response.text());
assert.equal(
  (await (await fetch(base + "/")).text()).includes(name + "-未发布修改"),
  false,
);
assert.equal((await save("publish", 1)).status, 409);
const upload = await fetch(base + "/api/admin/upload", {
  method: "POST",
  headers: { Origin: base, Cookie: cookie, "x-file-extension": "png" },
  body: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1sAAAAASUVORK5CYII=",
    "base64",
  ),
});
assert.equal(upload.status, 200);
const { url } = await upload.json();
writeFileSync(
  "output/playwright/admin-test-media.json",
  JSON.stringify({ key: url.slice(7) }),
);
assert.equal((await fetch(base + url)).status, 404);
assert.equal(
  (await fetch(base + url, { headers: { Cookie: cookie } })).status,
  200,
);
response = await save("publish", 3, {
  ...data,
  cover: { url, alt: "测试封面" },
});
assert.equal(response.status, 200, await response.text());
assert.equal((await fetch(base + url)).status, 200);
const exported = await fetch(base + "/api/admin/export", {
  headers: { Cookie: cookie },
});
assert.equal(exported.status, 200);
assert.equal((await exported.json()).version, 1);
response = await save("unpublish", 4, {
  ...data,
  cover: { url, alt: "测试封面" },
});
assert.equal(response.status, 200, await response.text());
assert.equal((await (await fetch(base + "/")).text()).includes(name), false);
assert.equal((await fetch(base + url)).status, 404);
assert.equal((await post("logout", {})).status, 200);
assert.equal(
  (await fetch(base + "/api/admin/records", { headers: { Cookie: cookie } }))
    .status,
  401,
);
assert.ok(before.includes("四川大学"));
console.log(
  "PASS: login, CSRF, draft isolation, publish, concurrent edits, upload access, unpublish, export, logout revocation",
);

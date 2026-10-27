import test from "node:test";
import assert from "node:assert/strict";
import { pbkdf2Sync } from "node:crypto";
import {
  verifyPassword,
  sameOrigin,
  sessionCookie,
} from "../src/lib/admin/auth.ts";
import { validateDocument, mediaPaths } from "../src/lib/admin/validation.ts";
import { detectUpload } from "../src/lib/admin/uploads.ts";
import { boundedBody } from "../src/lib/admin/http.ts";

test("password verifier accepts the intended password and rejects tampering", async () => {
  const salt = "00112233445566778899aabbccddeeff";
  const hash = pbkdf2Sync(
    "test-password-long",
    Buffer.from(salt, "hex"),
    100000,
    32,
    "sha256",
  ).toString("hex");
  const stored = `pbkdf2-sha256:100000:${salt}:${hash}`;
  assert.equal(await verifyPassword("test-password-long", stored), true);
  assert.equal(await verifyPassword("wrong", stored), false);
  assert.equal(await verifyPassword("test-password-long", "invalid"), false);
});
test("cross-origin writes are denied and production cookies require HTTPS", () => {
  const request = new Request("https://example.org/api/admin/save", {
    headers: { origin: "https://evil.org" },
  });
  assert.equal(sameOrigin(request), false);
  assert.equal(
    sameOrigin(
      new Request(request.url, { headers: { origin: "https://example.org" } }),
    ),
    true,
  );
  assert.equal(sameOrigin(new Request(request.url)), false);
  assert.match(
    sessionCookie(request, "token"),
    /HttpOnly; SameSite=Strict;.*Secure/,
  );
});
test("incomplete member drafts are allowed but publication needs fields and consent", () => {
  const draft = {
    name: "",
    role: "",
    bio: "",
    consentConfirmed: false,
    tags: [],
    experience: [],
    links: [],
  };
  assert.doesNotThrow(() => validateDocument("member", "abc", draft, false));
  assert.throws(() => validateDocument("member", "abc", draft, true));
  assert.throws(() =>
    validateDocument(
      "member",
      "abc",
      { ...draft, name: "姓名", role: "职责", bio: "简介" },
      true,
    ),
  );
  assert.doesNotThrow(() =>
    validateDocument(
      "member",
      "abc",
      {
        ...draft,
        name: "姓名",
        role: "职责",
        bio: "简介",
        consentConfirmed: true,
      },
      true,
    ),
  );
});
test("dangerous URLs and foreign images are rejected on save", () => {
  assert.throws(() =>
    validateDocument(
      "settings",
      "site-settings",
      { membershipUrl: "javascript:alert(1)", channels: [] },
      false,
    ),
  );
  assert.throws(() =>
    validateDocument(
      "settings",
      "site-settings",
      {
        membershipQr: { url: "https://evil.org/image.png", alt: "" },
        channels: [],
      },
      false,
    ),
  );
  assert.deepEqual(
    mediaPaths({
      a: { url: "/media/00000000-0000-0000-0000-000000000000.png" },
      b: "https://example.org",
    }),
    ["/media/00000000-0000-0000-0000-000000000000.png"],
  );
});
test("uploads reject executable image disguises and enforce byte bounds", async () => {
  const html = new TextEncoder().encode("<script>alert(1)</script>");
  assert.equal(detectUpload(html, "png"), undefined);
  assert.equal(detectUpload(html, "svg"), undefined);
  assert.equal(
    detectUpload(new TextEncoder().encode("%PDF-1.7\n"), "pdf")?.type,
    "application/pdf",
  );
  await assert.rejects(
    () =>
      boundedBody(
        new Request("https://example.org", { method: "POST", body: "12345" }),
        4,
      ),
    /过大/,
  );
});

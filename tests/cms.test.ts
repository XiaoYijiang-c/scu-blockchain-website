import test from "node:test";
import assert from "node:assert/strict";
import { normalizeContent, safePublicUrl } from "../src/lib/cms/normalize.ts";

const publicMember = {
  _id: "member-01",
  name: "测试成员",
  role: "测试职责",
  bio: "测试简介",
  visible: true,
  consentConfirmed: true,
};
const empty = () => ({
  members: [],
  events: [],
  resources: [],
  settings: null,
});

test("unpublished and unconfirmed profiles cannot cross the public content boundary", () => {
  const content = normalizeContent({
    ...empty(),
    members: [
      { ...publicMember, _id: "drafts.member-01" },
      { ...publicMember, _id: "versions.release.member-01" },
      { ...publicMember, visible: false },
      { ...publicMember, consentConfirmed: false },
      publicMember,
    ],
  });
  assert.equal(content.members.length, 1);
  assert.equal(content.members[0].name, "测试成员");
});

test("malicious links are dropped while usable public profiles remain", () => {
  const content = normalizeContent({
    ...empty(),
    members: [
      {
        ...publicMember,
        links: [
          { label: "bad", url: "javascript:alert(1)" },
          { label: "bad2", url: "data:text/html,<script>alert(1)</script>" },
          { label: "good", url: "https://example.org/profile" },
        ],
      },
    ],
  });
  assert.deepEqual(content.members[0].links, [
    { label: "good", url: "https://example.org/profile" },
  ]);
  assert.equal(safePublicUrl("https://user:pass@example.org/"), undefined);
});

test("an empty CMS dataset does not republish the local placeholder members", () => {
  const content = normalizeContent(empty());
  assert.deepEqual(content.members, []);
  assert.deepEqual(content.settings.channels, []);
});

test("resources require a usable link; uploaded files take precedence", () => {
  const base = {
    _id: "resource-1",
    visible: true,
    title: "测试资料",
    category: "分享课件",
  };
  const content = normalizeContent({
    ...empty(),
    resources: [
      { ...base, url: "javascript:bad" },
      {
        ...base,
        url: "https://example.org/",
        fileUrl: "https://cdn.sanity.io/files/project/production/demo.pdf",
      },
    ],
  });
  assert.equal(content.resources.length, 1);
  assert.match(content.resources[0].url, /demo\.pdf$/);
});

test("bad activity dates cannot break server-side date formatting", () => {
  const event = {
    _id: "event-1",
    visible: true,
    title: "测试活动",
    category: "技术沙龙",
    summary: "测试摘要",
  };
  const content = normalizeContent({
    ...empty(),
    events: [
      { ...event, date: "bad date" },
      { ...event, date: "2026-10-26T10:00:00Z" },
    ],
  });
  assert.equal(content.events.length, 1);
});

test("malformed responses are distinguished from intentional empty content", () => {
  assert.throws(() => normalizeContent(null), /Invalid/);
  assert.throws(
    () => normalizeContent({ error: "unauthorized" }),
    /Incomplete/,
  );
});

test("partially configured contacts keep the usable link without requiring a QR image", () => {
  const content = normalizeContent({
    ...empty(),
    settings: {
      membershipUrl: "https://example.org/join",
      cooperationUrl: "javascript:alert(1)",
      channels: [{ label: "公众号", value: "测试名称" }],
    },
  });
  assert.equal(content.settings.membershipUrl, "https://example.org/join");
  assert.equal(content.settings.cooperationUrl, undefined);
  assert.deepEqual(content.settings.channels, [
    { label: "公众号", value: "测试名称" },
  ]);
});

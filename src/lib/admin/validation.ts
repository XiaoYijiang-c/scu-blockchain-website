import { z } from "astro/zod";
import {
  member,
  event,
  resource,
  settings,
  safePublicUrl,
} from "../cms/normalize.ts";

export const kinds = ["member", "event", "resource", "settings"] as const;
export type Kind = (typeof kinds)[number];
export const isKind = (value: string): value is Kind =>
  kinds.includes(value as Kind);
const text = (max: number) => z.string().max(max);
const link = text(4096).refine(
  (v) => !v || Boolean(safePublicUrl(v)),
  "链接必须为 http(s) 地址或本站上传文件地址",
);
const image = z.object({
  url: text(200).regex(/^\/media\/[a-f0-9-]{36}\.(jpg|png|webp)$/),
  alt: text(200),
});
const common = { sortOrder: z.number().int().min(-9999).max(9999).optional() };
const schemas = {
  member: z.object({
    ...common,
    name: text(100),
    role: text(200),
    bio: text(3000),
    avatar: image.optional(),
    avatarKind: z.enum(["photo", "illustration"]).optional(),
    consentConfirmed: z.boolean(),
    tags: z.array(text(60)).max(20),
    experience: z
      .array(z.object({ title: text(200), text: text(2000) }))
      .max(30),
    links: z.array(z.object({ label: text(80), url: link })).max(10),
  }),
  event: z.object({
    ...common,
    title: text(200),
    category: text(60),
    date: text(60),
    summary: text(1000),
    body: text(20000),
    cover: image.optional(),
    url: link.optional(),
  }),
  resource: z.object({
    ...common,
    title: text(200),
    category: text(60),
    description: text(2000),
    url: link.optional(),
    fileUrl: link.optional(),
  }),
  settings: z.object({
    membershipUrl: link.optional(),
    cooperationUrl: link.optional(),
    membershipQr: image.optional(),
    cooperationQr: image.optional(),
    channels: z
      .array(
        z.object({ label: text(80), value: text(300), url: link.optional() }),
      )
      .max(12),
  }),
};
export function validateDocument(
  kind: Kind,
  id: string,
  data: unknown,
  publish: boolean,
) {
  const clean = schemas[kind].parse(data);
  const document = { ...clean, _id: id, visible: true };
  if (publish) ({ member, event, resource, settings })[kind].parse(document);
  return document;
}
export function mediaPaths(value: unknown): string[] {
  if (typeof value === "string")
    return /^\/media\/[a-f0-9-]{36}\.[a-z0-9]+$/.test(value) ? [value] : [];
  if (Array.isArray(value)) return [...new Set(value.flatMap(mediaPaths))];
  if (value && typeof value === "object")
    return [...new Set(Object.values(value).flatMap(mediaPaths))];
  return [];
}

import { z } from "astro/zod";
import type { CmsImage, PublicMember, SiteContent } from "./types.ts";

const text = (max = 2000) => z.string().trim().max(max);
const optionalText = (max = 2000) =>
  text(max)
    .nullish()
    .transform((value) => value ?? "");
export function safePublicUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 4096) return;
  try {
    const url = new URL(value);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return;
    return url.href;
  } catch {
    return;
  }
}
const safeLink = z.unknown().optional().transform(safePublicUrl);
const image = z
  .object({ url: text(4096), alt: optionalText(200) })
  .nullish()
  .transform((value): CmsImage | undefined => {
    if (!value) return;
    const url = safePublicUrl(value.url);
    if (!url || new URL(url).hostname !== "cdn.sanity.io") return;
    return { url, alt: value.alt };
  });
const identity = {
  _id: text(150)
    .min(1)
    .refine(
      (id) =>
        /^[\w.-]+$/.test(id) &&
        !id.startsWith("drafts.") &&
        !id.startsWith("versions."),
    ),
};
const member = z.object({
  ...identity,
  visible: z.literal(true),
  consentConfirmed: z.literal(true),
  name: text(100).min(1),
  role: text(200).min(1),
  bio: text(3000).min(1),
  avatar: image,
  avatarKind: z.enum(["illustration", "photo"]).nullish(),
  tags: z.array(text(60)).max(20).nullish(),
  experience: z
    .array(z.object({ title: text(200), text: text(2000) }))
    .max(30)
    .nullish(),
  links: z
    .array(z.object({ label: text(80), url: safeLink }))
    .max(10)
    .nullish(),
});
const event = z.object({
  ...identity,
  visible: z.literal(true),
  title: text(200).min(1),
  category: text(60).min(1),
  date: text(60).refine((value) => Number.isFinite(Date.parse(value))),
  summary: text(1000).min(1),
  body: optionalText(20000),
  cover: image,
  url: safeLink,
});
const resource = z
  .object({
    ...identity,
    visible: z.literal(true),
    title: text(200).min(1),
    category: text(60).min(1),
    description: optionalText(2000),
    url: safeLink,
    fileUrl: safeLink,
  })
  .refine((value) => Boolean(value.url || value.fileUrl));
const settings = z.object({
  membershipUrl: safeLink,
  membershipQr: image,
  cooperationUrl: safeLink,
  cooperationQr: image,
  channels: z
    .array(
      z.object({
        label: text(80).min(1),
        value: text(300).min(1),
        url: safeLink,
      }),
    )
    .max(12)
    .nullish(),
});
function validItems<T>(schema: z.ZodType<T>, input: unknown): T[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 100).flatMap((item) => {
    const result = schema.safeParse(item);
    return result.success ? [result.data] : [];
  });
}
export function normalizeContent(input: unknown): Omit<SiteContent, "source"> {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Invalid CMS response");
  const data = input as Record<string, unknown>;
  if (
    !Array.isArray(data.members) ||
    !Array.isArray(data.events) ||
    !Array.isArray(data.resources)
  )
    throw new Error("Incomplete CMS response");
  const members: PublicMember[] = validItems(member, data.members).map(
    (item, index) => ({
      id: String(index + 1).padStart(2, "0"),
      name: item.name,
      role: item.role,
      bio: item.bio,
      avatar: item.avatar?.url ?? "/images/members/avatar-01.webp",
      avatarDescription: item.avatar?.alt || item.name,
      avatarKind: item.avatar ? (item.avatarKind ?? "photo") : "illustration",
      tags: item.tags ?? [],
      experience: item.experience ?? [],
      links: (item.links ?? []).flatMap((link) =>
        link.url ? [{ label: link.label, url: link.url }] : [],
      ),
      placeholder: false,
    }),
  );
  const parsedSettings = settings.safeParse(data.settings ?? {});
  return {
    members,
    events: validItems(event, data.events).map((item) => ({
      id: item._id,
      title: item.title,
      category: item.category,
      date: item.date,
      summary: item.summary,
      body: item.body,
      cover: item.cover,
      url: item.url,
    })),
    resources: validItems(resource, data.resources).map((item) => ({
      id: item._id,
      title: item.title,
      category: item.category,
      description: item.description,
      url: (item.fileUrl || item.url)!,
    })),
    settings: parsedSettings.success
      ? { ...parsedSettings.data, channels: parsedSettings.data.channels ?? [] }
      : { channels: [] },
  };
}

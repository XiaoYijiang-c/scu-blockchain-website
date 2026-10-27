import type { Member } from "../../data/members";

export interface CmsImage {
  url: string;
  alt: string;
}
export interface PublicMember extends Member {
  avatarKind?: "illustration" | "photo";
}
export interface EventRecord {
  id: string;
  title: string;
  category: string;
  date: string;
  summary: string;
  body: string;
  cover?: CmsImage;
  url?: string;
}
export interface ResourceRecord {
  id: string;
  title: string;
  category: string;
  description: string;
  url: string;
}
export interface SiteSettings {
  membershipUrl?: string;
  membershipQr?: CmsImage;
  cooperationUrl?: string;
  cooperationQr?: CmsImage;
  channels: { label: string; value: string; url?: string }[];
}
export interface SiteContent {
  members: PublicMember[];
  events: EventRecord[];
  resources: ResourceRecord[];
  settings: SiteSettings;
  source: "local" | "cloudflare" | "fallback";
}

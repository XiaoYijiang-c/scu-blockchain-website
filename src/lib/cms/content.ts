import { createClient } from "@sanity/client";
import { members } from "../../data/members";
import { normalizeContent } from "./normalize";
import type { SiteContent } from "./types";

const query = `{
  "members": *[_type == "member" && visible == true && consentConfirmed == true] | order(sortOrder asc, _createdAt asc)[0...100] {
    _id, visible, consentConfirmed, name, role, bio, avatarKind, tags, experience[]{title, text}, links[]{label, url},
    "avatar": avatar { "url": asset->url, alt }
  },
  "events": *[_type == "event" && visible == true] | order(date desc)[0...100] {
    _id, visible, title, category, date, summary, body, url, "cover": cover { "url": asset->url, alt }
  },
  "resources": *[_type == "resource" && visible == true] | order(sortOrder asc, _createdAt asc)[0...100] {
    _id, visible, title, category, description, url, "fileUrl": file.asset->url
  },
  "settings": *[_type == "siteSettings" && _id == "site-settings"][0] {
    membershipUrl, cooperationUrl, channels[]{label, value, url},
    "membershipQr": membershipQr { "url": asset->url, alt },
    "cooperationQr": cooperationQr { "url": asset->url, alt }
  }
}`;

export async function getSiteContent(): Promise<SiteContent> {
  const local: SiteContent = {
    members,
    events: [],
    resources: [],
    settings: { channels: [] },
    source: "local",
  };
  const projectId = (
    process.env.SANITY_PROJECT_ID || import.meta.env.SANITY_PROJECT_ID
  )?.trim();
  const dataset =
    (process.env.SANITY_DATASET || import.meta.env.SANITY_DATASET)?.trim() ||
    "production";
  if (!projectId) return local;
  try {
    if (!/^[a-z0-9]+$/.test(projectId) || !/^[a-z0-9_-]+$/.test(dataset))
      throw new Error("Invalid CMS configuration");
    const client = createClient({
      projectId,
      dataset,
      apiVersion: "2026-10-25",
      perspective: "published",
      useCdn: false,
      token:
        process.env.SANITY_READ_TOKEN ||
        import.meta.env.SANITY_READ_TOKEN ||
        undefined,
      timeout: 5000,
      maxRetries: 0,
    });
    const content = normalizeContent(await client.fetch<unknown>(query));
    return { ...content, source: "sanity" };
  } catch {
    // Keep the existing public placeholders available during a CMS outage.
    // Never log request details: a private dataset may use a read token.
    console.warn(
      "[cms] Sanity unavailable or invalid; using local public content.",
    );
    return { ...local, source: "fallback" };
  }
}

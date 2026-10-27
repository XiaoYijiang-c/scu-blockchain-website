import { members } from "../../data/members";
import { bindings } from "../admin/env";
import { normalizeContent } from "./normalize";
import type { SiteContent } from "./types";

export async function getSiteContent(): Promise<SiteContent> {
  const local: SiteContent = {
    members,
    events: [],
    resources: [],
    settings: { channels: [] },
    source: "local",
  };
  try {
    const { DB } = bindings();
    const rows = await DB.prepare(
      "SELECT kind, published FROM content ORDER BY updated_at, id",
    ).all<{ kind: string; published: string | null }>();
    if (!rows.results.length) return local;
    const documents = rows.results
      .filter((row) => row.published)
      .map((row) => ({ kind: row.kind, data: JSON.parse(row.published!) }));
    const byKind = (kind: string) =>
      documents
        .filter((row) => row.kind === kind)
        .map((row) => row.data)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const normalized = normalizeContent({
      members: byKind("member"),
      events: byKind("event").sort(
        (a, b) => Date.parse(b.date) - Date.parse(a.date),
      ),
      resources: byKind("resource"),
      settings: byKind("settings")[0],
    });
    const memberPublishingStarted = await DB.prepare(
      "SELECT key FROM cms_state WHERE key='members_initialized'",
    ).first();
    if (!memberPublishingStarted) normalized.members = members;
    return { ...normalized, source: "cloudflare" };
  } catch {
    console.warn(
      "[cms] Content storage unavailable. Check D1 binding and migrations.",
    );
    return { ...local, source: "fallback" };
  }
}

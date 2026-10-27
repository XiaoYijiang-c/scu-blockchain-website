import type { APIRoute } from "astro";
import { bindings } from "../../lib/admin/env";
import { authenticated } from "../../lib/admin/auth";

export const GET: APIRoute = async ({ request, params }) => {
  const key = params.key ?? "";
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp|pdf|zip|txt|docx|pptx)$/.test(key))
    return new Response(null, { status: 404 });
  const env = bindings();
  try {
    const published = await env.DB.prepare(
      "SELECT id FROM content WHERE published IS NOT NULL AND instr(published, ?) > 0 LIMIT 1",
    )
      .bind(JSON.stringify(`/media/${key}`))
      .first();
    if (!published && !(await authenticated(request, env)))
      return new Response(null, {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      });
    const object = await env.MEDIA.get(key);
    if (!object) return new Response(null, { status: 404 });
    const headers = new Headers({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cross-Origin-Resource-Policy": "same-origin",
    });
    object.writeHttpMetadata(headers);
    headers.set("ETag", object.httpEtag);
    if (!/\.(jpg|png|webp)$/.test(key))
      headers.set("Content-Disposition", `attachment; filename="${key}"`);
    return new Response(object.body, { headers });
  } catch {
    return new Response(null, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
};

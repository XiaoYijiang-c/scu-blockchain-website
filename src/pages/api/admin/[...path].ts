import type { APIRoute } from "astro";
import { bindings } from "../../../lib/admin/env";
import {
  authenticated,
  configured,
  digest,
  hex,
  sameOrigin,
  sessionCookie,
  sessionSeconds,
  sessionToken,
  verifyPassword,
} from "../../../lib/admin/auth";
import { boundedBody, json } from "../../../lib/admin/http";
import {
  isKind,
  mediaPaths,
  validateDocument,
} from "../../../lib/admin/validation";
import { detectUpload } from "../../../lib/admin/uploads";

export const ALL: APIRoute = async ({ request, params }) => {
  const env = bindings();
  const path = params.path ?? "";
  const method = request.method;
  if (!["GET", "POST"].includes(method))
    return json({ error: "不支持此操作" }, 405);
  if (method !== "GET" && !sameOrigin(request))
    return json({ error: "请求来源不匹配，请从本站后台重试" }, 403);
  if (!configured(env))
    return json(
      { error: "请先配置管理员账号和密码哈希，参见 docs/cms.md" },
      503,
    );
  try {
    if (path === "login" && method === "POST") {
      const now = Math.floor(Date.now() / 1000);
      const ip = request.headers.get("CF-Connecting-IP") || "local";
      const key = await digest(ip + ":" + Math.floor(now / 900));
      const attempt = await env.DB.prepare(
        "INSERT INTO login_attempts(key, attempts, expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1 RETURNING attempts",
      )
        .bind(key, now + 900)
        .first<{ attempts: number }>();
      if (!attempt || attempt.attempts > 10)
        return json({ error: "尝试次数过多，请 15 分钟后重试" }, 429, {
          "Retry-After": "900",
        });
      const input = JSON.parse(
        new TextDecoder().decode(await boundedBody(request, 2048)),
      );
      const password = typeof input.password === "string" ? input.password : "";
      const valid =
        password.length <= 256 &&
        (await verifyPassword(password, env.ADMIN_PASSWORD_HASH!));
      if (!valid || input.username !== env.ADMIN_USERNAME)
        return json({ error: "账号或密码不正确" }, 401);
      const token = hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
      await env.DB.batch([
        env.DB.prepare("DELETE FROM sessions WHERE expires_at<=?").bind(now),
        env.DB.prepare("DELETE FROM login_attempts WHERE expires_at<=?").bind(
          now,
        ),
        env.DB.prepare(
          "INSERT INTO sessions(token_hash,credential_version,expires_at) VALUES (?,?,?)",
        ).bind(
          await digest(token),
          await digest(env.ADMIN_USERNAME! + env.ADMIN_PASSWORD_HASH!),
          now + sessionSeconds,
        ),
      ]);
      return json({ ok: true }, 200, {
        "Set-Cookie": sessionCookie(request, token),
      });
    }
    if (!(await authenticated(request, env)))
      return json({ error: "请先登录，或重新登录以继续" }, 401);
    if (path === "logout" && method === "POST") {
      await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?")
        .bind(await digest(sessionToken(request)))
        .run();
      return json({ ok: true }, 200, {
        "Set-Cookie": sessionCookie(request, "", 0),
      });
    }
    if (path === "records" && method === "GET") {
      const rows = await env.DB.prepare(
        "SELECT * FROM content ORDER BY updated_at DESC, id",
      ).all();
      return json({
        records: rows.results.map((row) => ({
          ...row,
          draft: JSON.parse(row.draft as string),
          published: row.published ? JSON.parse(row.published as string) : null,
        })),
      });
    }
    if (path === "export" && method === "GET") {
      const records = await env.DB.prepare(
        "SELECT * FROM content ORDER BY kind,id",
      ).all();
      return json(
        {
          version: 1,
          exportedAt: new Date().toISOString(),
          records: records.results,
        },
        200,
        {
          "Content-Disposition": "attachment; filename=scu-content-backup.json",
        },
      );
    }
    if (path === "upload" && method === "POST") {
      const bytes = await boundedBody(request, 10 * 1024 * 1024);
      const file = detectUpload(
        bytes,
        request.headers.get("x-file-extension") ?? "",
      );
      if (!file)
        return json(
          {
            error:
              "支持 JPG、PNG、WebP、PDF、ZIP、DOCX、PPTX、TXT，文件内容须与格式一致，最大 10 MB",
          },
          400,
        );
      const key = `${crypto.randomUUID()}.${file.ext}`;
      await env.MEDIA.put(key, bytes, {
        httpMetadata: { contentType: file.type },
      });
      return json({ url: `/media/${key}` });
    }
    if (path === "save" && method === "POST") {
      const input = JSON.parse(
        new TextDecoder().decode(await boundedBody(request, 64000)),
      );
      if (
        !isKind(input.kind) ||
        !["draft", "publish", "unpublish"].includes(input.action) ||
        !Number.isInteger(input.revision) ||
        input.revision < 0
      )
        return json({ error: "无效的内容类型或操作" }, 400);
      const id =
        input.id ||
        (input.kind === "settings" ? "site-settings" : crypto.randomUUID());
      if (
        (!/^[a-f0-9-]{36}$/.test(id) && id !== "site-settings") ||
        (input.kind === "settings") !== (id === "site-settings")
      )
        return json({ error: "无效的记录编号" }, 400);
      const data = validateDocument(
        input.kind,
        id,
        input.data,
        input.action === "publish",
      );
      for (const path of mediaPaths(data)) {
        if (!(await env.MEDIA.head(path.slice(7))))
          return json({ error: "引用的文件不存在，请重新上传" }, 400);
      }
      const draft = JSON.stringify(data);
      const published = input.action === "publish" ? draft : null;
      let changed;
      if (input.revision === 0) {
        changed = await env.DB.prepare(
          "INSERT INTO content(id,kind,draft,published) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING",
        )
          .bind(id, input.kind, draft, published)
          .run();
      } else {
        changed = await env.DB.prepare(
          "UPDATE content SET draft=?, published=CASE WHEN ?='draft' THEN published ELSE ? END, revision=revision+1, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND kind=? AND revision=?",
        )
          .bind(draft, input.action, published, id, input.kind, input.revision)
          .run();
      }
      if (!changed.meta.changes)
        return json(
          { error: "此内容已被其他窗口修改，请刷新列表后重新编辑" },
          409,
        );
      return json({ ok: true, id, revision: input.revision + 1 });
    }
    return json({ error: "接口不存在" }, 404);
  } catch (error) {
    if (error instanceof SyntaxError)
      return json({ error: "请求格式错误" }, 400);
    if (error && typeof error === "object" && "issues" in error) {
      const issues = (
        error as { issues: { path: (string | number)[]; message: string }[] }
      ).issues;
      return json(
        {
          error: "请检查必填项、长度和公开授权",
          details: issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .slice(0, 8),
        },
        400,
      );
    }
    if (error instanceof Error && error.message === "请求内容过大")
      return json({ error: error.message }, 413);
    console.error(
      "[admin] Storage operation failed. Check Cloudflare bindings and migrations.",
    );
    return json(
      { error: "存储暂不可用，请检查数据库迁移和存储绑定后重试" },
      503,
    );
  }
};

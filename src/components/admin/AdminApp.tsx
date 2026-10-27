import { useEffect, useState } from "react";
import {
  Plus,
  Save,
  Upload,
  LogOut,
  ArrowUpRight,
  Download,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  emptyDocument,
  fields,
  sections,
  type Kind,
  type DocumentData,
  type TextField,
} from "./fields";

interface RecordItem {
  id: string;
  kind: Kind;
  draft: DocumentData;
  published: DocumentData | null;
  revision: number;
  updated_at: string;
}
async function api<T = { ok: boolean }>(
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(
    `/api/admin/${path}`,
    body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const data = (await response.json()) as T & {
    error?: string;
    details?: string[];
  };
  if (!response.ok)
    throw new Error([data.error, ...(data.details ?? [])].join("\n"));
  return data;
}
const textValue = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";

function TextControl({
  field,
  value,
  onChange,
  prefix = "content",
}: {
  field: TextField;
  value: unknown;
  onChange: (value: string | number) => void;
  prefix?: string;
}) {
  const id = `${prefix}-${field.key}`;
  return (
    <Field>
      <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
      {field.multiline ? (
        <Textarea
          id={id}
          value={textValue(value)}
          maxLength={field.max}
          rows={field.key === "body" ? 9 : 3}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          id={id}
          type={field.type ?? "text"}
          value={textValue(value)}
          maxLength={field.max}
          min={field.type === "number" ? -9999 : undefined}
          max={field.type === "number" ? 9999 : undefined}
          onChange={(e) =>
            onChange(
              field.type === "number" ? Number(e.target.value) : e.target.value,
            )
          }
        />
      )}
      {field.hint && <FieldDescription>{field.hint}</FieldDescription>}
    </Field>
  );
}
function Rows({
  label,
  columns,
  value,
  onChange,
  max,
}: {
  label: string;
  columns: TextField[];
  value: unknown;
  onChange: (value: unknown) => void;
  max: number;
}) {
  const rows = (Array.isArray(value) ? value : []) as Record<string, string>[];
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-3 font-medium">{label}</legend>
      {rows.map((row, i) => (
        <div className="flex flex-col gap-3 rounded-lg border p-4" key={i}>
          <FieldGroup>
            {columns.map((field) => (
              <TextControl
                key={field.key}
                prefix={`${label}-${i}`}
                field={field}
                value={row[field.key]}
                onChange={(v) =>
                  onChange(
                    rows.map((r, j) =>
                      j === i ? { ...r, [field.key]: v } : r,
                    ),
                  )
                }
              />
            ))}
          </FieldGroup>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
          >
            移除此条
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={rows.length >= max}
        onClick={() =>
          onChange([
            ...rows,
            Object.fromEntries(columns.map((c) => [c.key, ""])),
          ])
        }
      >
        <Plus data-icon="inline-start" />
        添加{label}
      </Button>
    </fieldset>
  );
}
function MediaField({
  label,
  value,
  onChange,
  attachment,
  onError,
  onBusy,
}: {
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
  attachment?: boolean;
  onError: (message: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const image =
    value && typeof value === "object"
      ? (value as { url: string; alt: string })
      : undefined;
  const url = attachment ? textValue(value) : image?.url;
  const id = `upload-${label}`;
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {url && (
        <div className="flex flex-wrap items-center gap-3">
          {!attachment && (
            <img
              src={url}
              alt={image?.alt || label}
              className="size-24 rounded-lg object-cover"
            />
          )}
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-sm underline"
          >
            查看文件
          </a>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(undefined)}
          >
            移除引用
          </Button>
        </div>
      )}
      <Input
        id={id}
        type="file"
        disabled={uploading}
        accept={
          attachment ? ".pdf,.zip,.docx,.pptx,.txt" : ".jpg,.jpeg,.png,.webp"
        }
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const control = e.currentTarget;
          if (file.size > 10 * 1024 * 1024) {
            onError("文件不能超过 10 MB");
            control.value = "";
            return;
          }
          setUploading(true);
          onBusy(true);
          try {
            const response = await fetch("/api/admin/upload", {
              method: "POST",
              headers: { "x-file-extension": file.name.split(".").pop() ?? "" },
              body: file,
            });
            const result = (await response.json()) as {
              url: string;
              error?: string;
            };
            if (!response.ok) throw new Error(result.error);
            onChange(
              attachment
                ? result.url
                : { url: result.url, alt: image?.alt ?? "" },
            );
          } catch (error) {
            onError((error as Error).message);
          } finally {
            setUploading(false);
            onBusy(false);
            control.value = "";
          }
        }}
      />
      <FieldDescription>
        {uploading ? "正在上传…" : "最大 10 MB。文件随引用它的内容发布后公开。"}
      </FieldDescription>
      {!attachment && image && (
        <TextControl
          prefix={id}
          field={{ key: "alt", label: "图片说明", max: 200 }}
          value={image.alt}
          onChange={(alt) => onChange({ ...image, alt })}
        />
      )}
    </Field>
  );
}

export default function AdminApp({
  initialLoggedIn,
  setupError,
}: {
  initialLoggedIn: boolean;
  setupError?: string;
}) {
  const [loggedIn, setLoggedIn] = useState(initialLoggedIn);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [kind, setKind] = useState<Kind>("member");
  const [selected, setSelected] = useState<RecordItem | null>(null);
  const [data, setData] = useState<DocumentData | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(setupError ?? "");
  const [loading, setLoading] = useState(false);
  const locked = busy || uploadCount > 0;
  const section = sections.find((s) => s.kind === kind)!;
  const filtered = records.filter((r) => r.kind === kind);
  async function refresh() {
    const result = await api<{ records: RecordItem[] }>("records");
    setRecords(result.records);
    return result.records;
  }
  useEffect(() => {
    if (loggedIn) {
      setLoading(true);
      refresh()
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [loggedIn]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const mayLeave = () =>
    !dirty || window.confirm("当前有未保存修改，确定离开吗？");
  function edit(record: RecordItem | null) {
    if (!mayLeave()) return;
    setSelected(record);
    setData(record ? structuredClone(record.draft) : emptyDocument(kind));
    setDirty(false);
    setError("");
    setMessage("");
  }
  function update(key: string, value: unknown) {
    setData((previous) => ({ ...previous, [key]: value }));
    setDirty(true);
  }
  async function save(action: "draft" | "publish" | "unpublish") {
    if (!data) return;
    if (
      action === "unpublish" &&
      !window.confirm("下架后，访客将无法查看这条内容。继续吗？")
    )
      return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api<{ id: string; revision: number }>("save", {
        kind,
        id: selected?.id,
        revision: selected?.revision ?? 0,
        action,
        data,
      });
      // Keep the returned revision even if refreshing the list fails.
      setSelected({
        id: result.id,
        kind,
        draft: data,
        published:
          action === "publish"
            ? data
            : action === "unpublish"
              ? null
              : (selected?.published ?? null),
        revision: result.revision,
        updated_at: new Date().toISOString(),
      });
      setDirty(false);
      setMessage(
        action === "draft"
          ? "草稿已保存，网站仍显示上一次发布的内容。"
          : action === "publish"
            ? "已发布，刷新网站即可查看。"
            : "已下架，草稿仍保留。",
      );
      const all = await refresh();
      const current = all.find((r) => r.id === result.id)!;
      setSelected(current);
      setData(current.draft);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!loggedIn)
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-12 sm:py-24">
        <p className="text-sm tracking-widest text-muted-foreground">
          SCU / CONTENT STUDIO
        </p>
        <Card>
          <CardHeader>
            <CardTitle>
              <h1>网站内容管理</h1>
            </CardTitle>
            <CardDescription>
              登录后维护协会成员、活动与学习资源。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              id="login-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                setBusy(true);
                setError("");
                try {
                  await api("login", {
                    username: form.get("username"),
                    password: form.get("password"),
                  });
                  setLoggedIn(true);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="username">管理员账号</FieldLabel>
                  <Input
                    id="username"
                    name="username"
                    autoComplete="username"
                    required
                    maxLength={100}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">密码</FieldLabel>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    maxLength={256}
                  />
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              form="login-form"
              className="w-full"
              disabled={busy || Boolean(setupError)}
            >
              {busy ? "登录中…" : "登录后台"}
            </Button>
          </CardFooter>
        </Card>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>暂时无法登录</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <a href="/" className="text-sm text-muted-foreground underline">
          返回协会网站
        </a>
      </div>
    );
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 py-8 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-5">
        <div>
          <p className="text-xs tracking-widest text-muted-foreground">
            SCU / CONTENT STUDIO
          </p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
            让每一次更新，都有记录。
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href="/" target="_blank" rel="noreferrer">
              查看网站
              <ArrowUpRight data-icon="inline-end" />
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/api/admin/export" download>
              <Download data-icon="inline-start" />
              导出内容
            </a>
          </Button>
          <Button
            variant="ghost"
            disabled={locked}
            onClick={async () => {
              if (!mayLeave()) return;
              setBusy(true);
              try {
                await api("logout", {});
                setDirty(false);
                setData(null);
                setRecords([]);
                setLoggedIn(false);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <LogOut data-icon="inline-start" />
            退出
          </Button>
        </div>
      </header>
      <div aria-live="polite" className="flex flex-col gap-3">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>操作未完成</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap">
              {error}
            </AlertDescription>
          </Alert>
        )}
        {message && (
          <Alert>
            <Check />
            <AlertTitle>更新状态</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="flex min-w-0 flex-col gap-5">
          <Field>
            <FieldLabel htmlFor="section">内容分类</FieldLabel>
            <NativeSelect
              id="section"
              value={kind}
              disabled={locked}
              onChange={(e) => {
                if (!mayLeave()) return;
                setKind(e.target.value as Kind);
                setSelected(null);
                setData(null);
                setDirty(false);
                setMessage("");
                setError("");
              }}
            >
              {sections.map((s) => (
                <NativeSelectOption key={s.kind} value={s.kind}>
                  {s.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>{section.label}</h2>
              </CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button
                variant="outline"
                disabled={locked}
                onClick={() =>
                  edit(kind === "settings" ? (filtered[0] ?? null) : null)
                }
              >
                <Plus data-icon="inline-start" />
                {kind === "settings" ? "编辑网站设置" : "新建内容"}
              </Button>
              <Button
                variant="ghost"
                disabled={locked || loading}
                onClick={async () => {
                  if (!mayLeave()) return;
                  setLoading(true);
                  try {
                    await refresh();
                    setSelected(null);
                    setData(null);
                    setDirty(false);
                    setError("");
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                刷新列表
              </Button>
              {loading ? (
                <p role="status">正在读取内容…</p>
              ) : (
                filtered.map((record) => (
                  <button
                    type="button"
                    key={record.id}
                    disabled={locked}
                    aria-pressed={selected?.id === record.id}
                    onClick={() => edit(record)}
                    className="flex min-w-0 flex-col gap-2 rounded-lg border p-3 text-left hover:bg-accent aria-pressed:bg-accent"
                  >
                    <span className="break-words font-medium">
                      {textValue(record.draft.name || record.draft.title) ||
                        (kind === "settings" ? "网站联系方式" : "未命名草稿")}
                    </span>
                    <Badge variant={record.published ? "secondary" : "outline"}>
                      {record.published
                        ? JSON.stringify(record.draft) !==
                          JSON.stringify(record.published)
                          ? "已发布 · 有草稿修改"
                          : "已发布"
                        : "草稿 / 已下架"}
                    </Badge>
                  </button>
                ))
              )}
              {!loading && !filtered.length && (
                <p className="text-sm text-muted-foreground">
                  还没有内容，点击上方按钮开始。
                </p>
              )}
            </CardContent>
            <CardFooter>
              <p className="text-xs text-muted-foreground">
                保存草稿不会替换已发布内容。
              </p>
            </CardFooter>
          </Card>
        </aside>
        {data ? (
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>{selected ? "编辑内容" : "新建内容"}</h2>
              </CardTitle>
              <CardDescription>
                {dirty ? "有未保存的修改" : "所有编辑仅在发布后展示给访客。"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                id="editor-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  save("publish");
                }}
              >
                <fieldset disabled={locked} className="min-w-0">
                  <FieldGroup>
                    {fields[kind].map((field) => (
                      <TextControl
                        key={field.key}
                        field={field}
                        value={data[field.key]}
                        onChange={(v) => update(field.key, v)}
                      />
                    ))}
                    {kind === "member" && (
                      <>
                        <TextControl
                          field={{
                            key: "tags",
                            label: "方向标签",
                            max: 1200,
                            hint: "用中文或英文逗号分隔，最多 20 个。",
                          }}
                          value={((data.tags as string[]) ?? []).join(",")}
                          onChange={(v) =>
                            update("tags", String(v).split(/[,，]/))
                          }
                        />
                        <Field>
                          <FieldLabel htmlFor="avatarKind">头像类型</FieldLabel>
                          <NativeSelect
                            id="avatarKind"
                            value={textValue(data.avatarKind)}
                            onChange={(e) =>
                              update("avatarKind", e.target.value)
                            }
                          >
                            <NativeSelectOption value="illustration">
                              插画头像
                            </NativeSelectOption>
                            <NativeSelectOption value="photo">
                              本人照片
                            </NativeSelectOption>
                          </NativeSelect>
                        </Field>
                        <Rows
                          label="经历"
                          value={data.experience}
                          onChange={(v) => update("experience", v)}
                          max={30}
                          columns={[
                            { key: "title", label: "经历标题", max: 200 },
                            {
                              key: "text",
                              label: "经历说明",
                              max: 2000,
                              multiline: true,
                            },
                          ]}
                        />
                        <Rows
                          label="公开链接"
                          value={data.links}
                          onChange={(v) => update("links", v)}
                          max={10}
                          columns={[
                            { key: "label", label: "链接名称", max: 80 },
                            {
                              key: "url",
                              label: "链接地址",
                              max: 4096,
                              type: "url",
                            },
                          ]}
                        />
                        <Field orientation="horizontal">
                          <Checkbox
                            id="consent"
                            checked={data.consentConfirmed === true}
                            onCheckedChange={(v) =>
                              update("consentConfirmed", v === true)
                            }
                          />
                          <FieldLabel htmlFor="consent">
                            已取得本人同意，允许公开展示这些资料
                          </FieldLabel>
                        </Field>
                      </>
                    )}
                    {kind === "settings" && (
                      <Rows
                        label="联系渠道"
                        value={data.channels}
                        onChange={(v) => update("channels", v)}
                        max={12}
                        columns={[
                          { key: "label", label: "渠道名称", max: 80 },
                          { key: "value", label: "联系信息", max: 300 },
                          {
                            key: "url",
                            label: "跳转链接（可选）",
                            max: 4096,
                            type: "url",
                          },
                        ]}
                      />
                    )}
                    {(kind === "member"
                      ? [{ key: "avatar", label: "成员头像" }]
                      : kind === "event"
                        ? [{ key: "cover", label: "活动封面" }]
                        : kind === "settings"
                          ? [
                              { key: "membershipQr", label: "报名二维码" },
                              { key: "cooperationQr", label: "合作二维码" },
                            ]
                          : [{ key: "fileUrl", label: "资源附件" }]
                    ).map((field) => (
                      <MediaField
                        key={field.key}
                        label={field.label}
                        value={data[field.key]}
                        attachment={kind === "resource"}
                        onChange={(v) => update(field.key, v)}
                        onError={setError}
                        onBusy={(v) => setUploadCount((n) => n + (v ? 1 : -1))}
                      />
                    ))}
                  </FieldGroup>
                </fieldset>
              </form>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={locked}
                onClick={() => save("draft")}
              >
                <Save data-icon="inline-start" />
                保存草稿
              </Button>
              <Button type="submit" form="editor-form" disabled={locked}>
                <Upload data-icon="inline-start" />
                {busy ? "处理中…" : "发布到网站"}
              </Button>
              {selected?.published && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={locked}
                  onClick={() => save("unpublish")}
                >
                  下架
                </Button>
              )}
            </CardFooter>
          </Card>
        ) : (
          <Empty className="min-h-80 border">
            <EmptyHeader>
              <EmptyTitle>从一条内容开始</EmptyTitle>
              <EmptyDescription>
                选择左侧内容进行编辑，或新建一条记录。首页的视觉与动效会保持原样。
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </div>
  );
}

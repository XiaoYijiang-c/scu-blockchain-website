export type Kind = "member" | "event" | "resource" | "settings";
export type DocumentData = Record<string, unknown>;
export interface TextField {
  key: string;
  label: string;
  max: number;
  multiline?: boolean;
  type?: "date" | "url" | "number";
  hint?: string;
}
export const sections: { kind: Kind; label: string; description: string }[] = [
  {
    kind: "member",
    label: "成员档案",
    description: "介绍团队成员，分享方向与经历。",
  },
  {
    kind: "event",
    label: "活动回顾",
    description: "记录已经发生的活动与成果。",
  },
  {
    kind: "resource",
    label: "学习资源",
    description: "整理资料链接与可下载文件。",
  },
  {
    kind: "settings",
    label: "联系方式",
    description: "维护报名入口、合作渠道与二维码。",
  },
];
export const fields: Record<Kind, TextField[]> = {
  member: [
    { key: "name", label: "姓名", max: 100 },
    { key: "role", label: "职责", max: 200 },
    { key: "bio", label: "个人简介", max: 3000, multiline: true },
    {
      key: "sortOrder",
      label: "展示顺序",
      max: 5,
      type: "number",
      hint: "数字越小越靠前。",
    },
  ],
  event: [
    { key: "title", label: "活动标题", max: 200 },
    { key: "category", label: "活动分类", max: 60 },
    { key: "date", label: "活动日期", max: 60, type: "date" },
    { key: "summary", label: "活动摘要", max: 1000, multiline: true },
    { key: "body", label: "活动正文", max: 20000, multiline: true },
    { key: "url", label: "相关资料链接", max: 4096, type: "url" },
  ],
  resource: [
    { key: "title", label: "资源名称", max: 200 },
    { key: "category", label: "资源分类", max: 60 },
    { key: "description", label: "资源说明", max: 2000, multiline: true },
    { key: "url", label: "外部链接", max: 4096, type: "url" },
    { key: "sortOrder", label: "展示顺序", max: 5, type: "number" },
  ],
  settings: [
    { key: "membershipUrl", label: "成员报名链接", max: 4096, type: "url" },
    { key: "cooperationUrl", label: "合作咨询链接", max: 4096, type: "url" },
  ],
};
export function emptyDocument(kind: Kind): DocumentData {
  const data: DocumentData = Object.fromEntries(
    fields[kind].map((field) => [field.key, field.type === "number" ? 0 : ""]),
  );
  if (kind === "member")
    Object.assign(data, {
      tags: [],
      experience: [],
      links: [],
      consentConfirmed: false,
      avatarKind: "illustration",
    });
  if (kind === "settings") data.channels = [];
  return data;
}

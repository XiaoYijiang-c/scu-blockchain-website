import { defineArrayMember, defineField, defineType } from "sanity";

const visibility = () =>
  defineField({
    name: "visible",
    title: "在网站公开展示",
    type: "boolean",
    initialValue: false,
    description: "开启并发布后才会出现在网站；关闭并发布可以撤下。",
  });
const order = () =>
  defineField({
    name: "sortOrder",
    title: "展示顺序",
    type: "number",
    initialValue: 0,
    validation: (Rule) => Rule.integer().min(0),
  });
const externalUrl = (name = "url", title = "外部链接") =>
  defineField({
    name,
    title,
    type: "url",
    validation: (Rule) => Rule.uri({ scheme: ["https", "http"] }),
  });
const image = (name: string, title: string) =>
  defineField({
    name,
    title,
    type: "image",
    options: { hotspot: true },
    fields: [
      defineField({
        name: "alt",
        title: "图片说明",
        type: "string",
        description: "供无障碍阅读使用，请描述图片内容。",
        validation: (Rule) => Rule.required().max(200),
      }),
    ],
  });
const categories = (values: string[]) =>
  values.map((value) => ({ title: value, value }));

const member = defineType({
  name: "member",
  title: "成员档案",
  type: "document",
  description: "仅填写本人确认可公开的资料。未发布的草稿不会被网站读取。",
  fields: [
    defineField({
      name: "name",
      title: "姓名 / 公开称呼",
      type: "string",
      validation: (Rule) => Rule.required().max(100),
    }),
    defineField({
      name: "role",
      title: "职责 / 身份",
      type: "string",
      validation: (Rule) => Rule.required().max(200),
    }),
    defineField({
      name: "bio",
      title: "个人简介",
      type: "text",
      rows: 4,
      validation: (Rule) => Rule.required().max(3000),
    }),
    image("avatar", "头像"),
    defineField({
      name: "avatarKind",
      title: "头像类型",
      type: "string",
      initialValue: "photo",
      options: {
        list: [
          { title: "本人照片", value: "photo" },
          { title: "插图 / 卡通头像", value: "illustration" },
        ],
      },
    }),
    defineField({
      name: "tags",
      title: "研究方向",
      type: "array",
      of: [
        defineArrayMember({
          type: "string",
          validation: (Rule) => Rule.max(60),
        }),
      ],
      options: { layout: "tags" },
      validation: (Rule) => Rule.max(20),
    }),
    defineField({
      name: "experience",
      title: "项目与经历",
      type: "array",
      validation: (Rule) => Rule.max(30),
      of: [
        defineArrayMember({
          type: "object",
          name: "experienceItem",
          fields: [
            defineField({
              name: "title",
              title: "项目 / 经历名称",
              type: "string",
              validation: (Rule) => Rule.required().max(200),
            }),
            defineField({
              name: "text",
              title: "说明",
              type: "text",
              validation: (Rule) => Rule.required().max(2000),
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: "links",
      title: "公开链接",
      type: "array",
      validation: (Rule) => Rule.max(10),
      of: [
        defineArrayMember({
          type: "object",
          name: "memberLink",
          fields: [
            defineField({
              name: "label",
              title: "链接名称",
              type: "string",
              validation: (Rule) => Rule.required().max(80),
            }),
            externalUrl(),
          ],
        }),
      ],
    }),
    order(),
    visibility(),
    defineField({
      name: "consentConfirmed",
      title: "本人已确认以上资料可以公开",
      type: "boolean",
      initialValue: false,
      validation: (Rule) =>
        Rule.custom((value, context) =>
          context.document?.visible && value !== true
            ? "公开展示前需取得本人确认。"
            : true,
        ),
    }),
  ],
  orderings: [
    {
      title: "展示顺序",
      name: "sortOrder",
      by: [{ field: "sortOrder", direction: "asc" }],
    },
  ],
  preview: { select: { title: "name", subtitle: "role", media: "avatar" } },
});

const event = defineType({
  name: "event",
  title: "活动回顾",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "活动标题",
      type: "string",
      validation: (Rule) => Rule.required().max(200),
    }),
    defineField({
      name: "category",
      title: "分类",
      type: "string",
      options: {
        list: categories([
          "招新",
          "主题讲座",
          "技术沙龙",
          "Workshop",
          "参赛纪实",
        ]),
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "date",
      title: "活动时间",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "summary",
      title: "摘要",
      type: "text",
      rows: 3,
      validation: (Rule) => Rule.required().max(1000),
    }),
    defineField({
      name: "body",
      title: "图文纪实正文",
      type: "text",
      rows: 12,
      description: "当前支持纯文本与换行，封面图片单独上传。",
      validation: (Rule) => Rule.max(20000),
    }),
    image("cover", "活动封面"),
    externalUrl("url", "活动资料 / 讲义链接"),
    visibility(),
  ],
  orderings: [
    {
      title: "活动时间倒序",
      name: "dateDesc",
      by: [{ field: "date", direction: "desc" }],
    },
  ],
  preview: { select: { title: "title", subtitle: "category", media: "cover" } },
});

const resource = defineType({
  name: "resource",
  title: "学习资源",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "资料名称",
      type: "string",
      validation: (Rule) => Rule.required().max(200),
    }),
    defineField({
      name: "category",
      title: "分类",
      type: "string",
      options: {
        list: categories([
          "入门路线",
          "分享课件",
          "项目解析",
          "研究报告",
          "备赛资料",
          "论文清单",
        ]),
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "资料说明",
      type: "text",
      validation: (Rule) => Rule.max(2000),
    }),
    externalUrl("url", "资料链接"),
    defineField({
      name: "file",
      title: "或上传资料文件",
      type: "file",
      options: { accept: ".pdf,.ppt,.pptx,.doc,.docx,.txt,.md,.zip" },
      description: "上传后网站优先使用文件链接，请确认有权公开该资料。",
    }),
    order(),
    visibility(),
  ],
  validation: (Rule) =>
    Rule.custom((value) => {
      const doc = value as
        | {
            visible?: boolean;
            url?: string;
            file?: { asset?: { _ref?: string } };
          }
        | undefined;
      return doc?.visible && !doc.url && !doc.file?.asset?._ref
        ? "公开资源需要资料链接或上传文件。"
        : true;
    }),
  preview: { select: { title: "title", subtitle: "category" } },
});

const siteSettings = defineType({
  name: "siteSettings",
  title: "联系方式与报名入口",
  type: "document",
  fields: [
    externalUrl("membershipUrl", "普通成员报名链接"),
    image("membershipQr", "成员报名二维码"),
    externalUrl("cooperationUrl", "合作咨询链接"),
    image("cooperationQr", "合作咨询二维码"),
    defineField({
      name: "channels",
      title: "其他联系渠道",
      type: "array",
      validation: (Rule) => Rule.max(12),
      of: [
        defineArrayMember({
          type: "object",
          name: "contactChannel",
          fields: [
            defineField({
              name: "label",
              title: "渠道名称",
              type: "string",
              validation: (Rule) => Rule.required().max(80),
            }),
            defineField({
              name: "value",
              title: "账号 / 联系方式",
              type: "string",
              validation: (Rule) => Rule.required().max(300),
            }),
            externalUrl(),
          ],
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: "联系方式与报名入口" }) },
});

export const schemaTypes = [member, event, resource, siteSettings];

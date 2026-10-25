import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./schemaTypes";

const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
if (!projectId)
  throw new Error(
    "请先按 docs/cms.md 配置 studio/.env.local 中的 SANITY_STUDIO_PROJECT_ID。",
  );

export default defineConfig({
  name: "scu-blockchain",
  title: "四川大学区块链协会 · 内容管理",
  projectId,
  dataset: process.env.SANITY_STUDIO_DATASET || "production",
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title("网站内容")
          .items([
            S.documentTypeListItem("member").title("成员档案"),
            S.documentTypeListItem("event").title("活动回顾"),
            S.documentTypeListItem("resource").title("学习资源"),
            S.divider(),
            S.listItem()
              .title("联系方式与报名入口")
              .id("site-settings")
              .child(
                S.document()
                  .schemaType("siteSettings")
                  .documentId("site-settings")
                  .title("联系方式与报名入口"),
              ),
          ]),
    }),
  ],
  schema: {
    types: schemaTypes,
    templates: (templates) =>
      templates.filter((item) => item.schemaType !== "siteSettings"),
  },
  document: {
    actions: (actions, context) =>
      context.schemaType === "siteSettings"
        ? actions.filter((action) =>
            ["publish", "discardChanges", "restore"].includes(
              action.action ?? "",
            ),
          )
        : actions,
  },
});

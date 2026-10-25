# 内容管理接入与使用

本分支采用 Astro + Node.js 服务端读取 Sanity 已发布内容，后台使用官方 Sanity Studio。前台没有登录按钮；管理员可收藏 Studio 地址，或访问本站 `/admin` 跳转到 Studio。登录与编辑权限由 Sanity 管理。

## 当前完成范围

- `studio/` 已配置成员、活动回顾、学习资源、联系方式四类中文表单。
- 网站服务端读取已发布文档；正常情况下发布后刷新网站即可更新，无须重新构建网站。
- 未配置项目 ID 时继续展示仓库现有内容，不访问 Sanity。
- CMS 查询失败时记录一条不含凭证的服务端日志，并回退到本地公开占位内容。已配置但没有公开成员时显示空状态，不会把占位人物当成真实成员重新发布。
- 活动正文当前采用纯文本与换行，封面独立上传；学习资源支持外部链接或文件上传。

## 1. 创建 Sanity 项目

在 Sanity 控制台创建项目，Dataset 建议使用 `production`，记录公开的 Project ID。项目应由协会负责人持有，邀请编辑人员进入项目，不共享个人登录凭证。

网站仅展示明确批准公开的内容。选择公开 Dataset 时，数据可被公开查询，不要在该 Dataset 中存储不应公开的个人信息。如果需要私有 Dataset，网站服务端需配置只读 Viewer Token。

## 2. 配置网站

复制根目录 `.env.example` 为 `.env`，填写：

```dotenv
SANITY_PROJECT_ID=你的项目ID
SANITY_DATASET=production
SANITY_READ_TOKEN=
SANITY_STUDIO_URL=
```

公开 Dataset 的 `SANITY_READ_TOKEN` 留空。私有 Dataset 使用只读 Viewer Token，并仅配置在服务器环境变量中；不要使用 `PUBLIC_` 前缀，不要填写写入 Token。

前台查询使用 `perspective: published` 和关闭 CDN 的读取方式；草稿与版本文档也会在数据校验层被排除。公开页面的数据经过长度、日期、图片来源和 URL 协议校验。

## 3. 启动现成后台

复制 `studio/.env.example` 为 `studio/.env.local`，填写同一个项目：

```dotenv
SANITY_STUDIO_PROJECT_ID=你的项目ID
SANITY_STUDIO_DATASET=production
SANITY_STUDIO_HOSTNAME=
```

```bash
npm --prefix studio ci
npm run cms:dev
```

按照终端地址打开 Studio，使用 Sanity 项目的账号登录。如登录提示 CORS 配置，将终端显示的 Studio 本地 Origin 加到 Sanity 项目的 API → CORS Origins 中；需要登录的 Studio Origin 允许凭证。

这是真实的 Sanity 后台，项目 ID 尚未配置时会明确提示需要配置，不会生成一个伪登录页。

## 4. 编辑与发布

| 菜单 | 操作 |
| --- | --- |
| 成员档案 | 填写姓名、职责、简介、头像、方向、经历及公开链接；确认本人同意公开，开启“在网站公开展示”，再发布 |
| 活动回顾 | 填写标题、分类、时间、摘要、正文、封面及资料链接，开启公开展示后发布 |
| 学习资源 | 填写名称、分类、说明，提供外部链接或上传资料文件，开启公开展示后发布 |
| 联系方式与报名入口 | 编辑两条报名 / 合作通道、二维码和联系渠道，点击发布；这是固定的单份网站设置 |

“保存草稿”不会更新网站。要撤下某条内容，关闭“在网站公开展示”后发布，或者取消发布该文档。成员和资源按展示顺序排列，活动按时间倒序排列。未上传头像的成员使用现有原创插图，并明确作为插图展示。

成员简介与活动 / 资源数量均有限制，避免录入错误拖垮页面；单类最多读取 100 条。若后续需要大量内容，下一步应增加列表分页与独立详情页。

## 5. 部署后台和网站

部署 Studio 前先在本机执行 Sanity CLI 登录（`npm exec --prefix studio -- sanity login`），然后：

```bash
npm run cms:deploy
```

按 CLI 提示选择 Studio 的托管名称。把部署完成的 HTTPS 地址填写到网站的 `SANITY_STUDIO_URL`，本站 `/admin` 将 302 跳转到这个后台。Studio 内的登录由 Sanity 处理；该地址不会出现在首页导航中。把托管 Studio Origin 按 Sanity 提示加入项目的 CORS Origins。

网站现在需要 Node.js 22.12 或更高版本：

```bash
npm ci
npm run build
npm run serve
```

部署平台使用 `npm run build` 构建，以 `node dist/server/entry.mjs` 启动，配置 `HOST`、`PORT` 和上述服务端环境变量。根目录 `npm run serve` 也支持从本地 `.env` 加载变量。动态网站不再使用静态文件托管的 `dist` 部署方式。

## 检查

```bash
npm run test:cms
npm run build
npm run cms:check
```

CI 检查网站构建和公开内容的数据边界。真实后台的登录、上传与发布联调需要已有 Sanity 项目、Dataset 和账号；没有真实项目时不能据本地构建声称这些线上操作已经完成。

`studio/package.json` 的 overrides 为 Sanity CLI 间接依赖锁定兼容的 js-yaml、smol-toml 和 undici 修复版本。升级 Sanity 时应重新检查这些覆盖是否仍有必要，并执行 Studio 类型检查与打包，避免直接执行会降级主依赖的强制审计修复。

参考：[Astro 与 Sanity](https://docs.astro.build/en/guides/cms/sanity/)、[Sanity Astro 入门](https://www.sanity.io/docs/astro-quickstart)、[Astro Node 适配器](https://docs.astro.build/en/guides/integrations-guide/node/)。

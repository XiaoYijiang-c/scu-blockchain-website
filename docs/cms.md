# 自建网站内容管理（Cloudflare）

网站与后台一起部署到 Cloudflare Workers，D1 保存结构化内容，R2 保存图片与附件。不需要 Sanity 账号或单独的 Node 服务器。后台在 `/admin`，首页没有登录入口。

## 本地启动

需要 Node.js 22.12+。在项目根目录执行：

```bash
npm ci
npm run db:local
npm run admin:password
```

密码工具交互读取至少 16 位密码，不在命令行参数或历史中保存密码。将输出的 `ADMIN_PASSWORD_HASH=...` 写入根目录 `.dev.vars`，并设置账号：

```dotenv
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=这里填写密码工具生成的完整值
```

然后执行 `npm run dev`，按终端实际地址打开网站和 `/admin`。开发环境使用本地模拟的 D1 / R2，数据保存在忽略的 `.wrangler/` 目录，不访问线上数据。`.dev.vars` 也被 Git 忽略。不要提交密码哈希。

首次发布成员前保留原有插画成员占位。首次发布后，成员区只展示已发布成员；全部下架时显示空状态，不会重新展示占位成员。草稿不会改变公开展示。

## 日常使用

1. 打开 `/admin`，输入管理员账号和密码。
2. 选择成员档案、活动回顾、学习资源或联系方式。
3. 新建或选择记录，编辑表单并上传图片 / 附件。
4. **保存草稿**只保存后台内容；**发布到网站**才替换访客看到的版本。
5. 发布后刷新首页查看；**下架**移除公开版本，但保留草稿。

成员发布需要姓名、职责、简介和本人公开授权；活动需要有效日期、分类和摘要；资源需要外部链接或上传附件。链接只接受 HTTP(S) 或本站上传文件。活动正文为纯文本，不执行 HTML。成员 / 资源排序数字越小越靠前，活动按日期倒序。单类前台当前最多展示 100 条。

图片支持 JPG / PNG / WebP；附件支持 PDF / ZIP / DOCX / PPTX / UTF-8 TXT，单个最大 10 MB。图片保存前检查文件签名；附件下载而非作为网页执行。文件在至少一条已发布记录引用时可公开访问，否则只允许管理员访问；下架不能撤回别人已经下载的副本。移除引用不会自动删除 R2 文件，避免误删其他记录引用的素材。

发布后继续修改并保存草稿，不会影响上一次发布内容。不同窗口同时编辑时，旧版本保存会被拒绝；先复制自己的修改，再刷新列表、重新编辑。离开未保存表单前会提示。

本版为单管理员后台，没有注册、邮件找回、多角色管理或富文本编辑器。密码重置方式是在本地生成新哈希并更新线上 Secret；旧会话会失效。会话有效期 8 小时，退出后立即撤销。生产站点使用 HTTPS。所有修改接口同时检查会话与同源请求；登录按 IP 每 15 分钟最多 10 次尝试。

## 部署到 Cloudflare Workers

当前网站地址：https://scu-blockchain-website.scu-blockchain.workers.dev ，后台在该地址的 `/admin`。本仓库的 `wrangler.jsonc` 已绑定协会账号的实际 D1 和 R2 资源，维护当前网站时不要重复创建数据库。管理员配置保存在 Cloudflare Secrets，未提交到 Git。

以下创建步骤供首次部署到另一个账号时参考。先登录自己的 Cloudflare 账号（设备授权可避免本地回调端口冲突）：

```bash
npx wrangler login --device
npx wrangler d1 create scu-website-content
npx wrangler r2 bucket create scu-website-media
```

将创建 D1 返回的 `database_id` 填入 `wrangler.jsonc`，保持绑定名 `DB`。如果修改 R2 桶名，同步修改 `bucket_name`，保持绑定名 `MEDIA`。R2 桶保持私有，不启用公开开发 URL；文件通过网站 `/media/…` 路由读取。

换账号时也要更新 `account_id`。R2 首次使用需在 Cloudflare 控制台启用。免费额度不是费用硬上限，超出存储或操作额度会计费；静态网站资源通过 Workers Assets 托管，后台上传的附件才进入 R2。可在 Cloudflare Billing 设置预算提醒，提醒本身不会自动停止服务。新账号还需首次注册免费的 workers.dev 子域名。

```bash
npm run db:remote
npx wrangler secret put ADMIN_USERNAME
npx wrangler secret put ADMIN_PASSWORD_HASH
npm run deploy
```

Secret 命令会提示输入值：账号输入你选定的管理员名；密码哈希输入 `pbkdf2-sha256:100000:...`，不要带变量名和等号。若 Cloudflare 要求先创建 Worker，先运行一次 `npm run deploy`（此时后台保持不可登录），再设置 Secrets 并重新检查。

打开部署输出的 `https://…workers.dev/admin` 登录。生产数据与本地模拟数据隔离，本地测试记录不会自动上传。代码部署不会重置 D1 / R2。后续代码更新执行 `npm run deploy`；新增数据库迁移时先审查并执行 `npm run db:remote`。本项目面向 Workers，不使用 Pages 的静态上传流程。

## 导出、备份与恢复

后台“导出内容”下载包含草稿、发布快照和版本号的 JSON，不包含密码、会话和 R2 文件。它是可读的内容备份；当前没有一键导入按钮。

完整数据库可用官方 D1 导出命令备份：

```bash
npx wrangler d1 export DB --remote --output=backup.sql
```

将备份保存到安全位置，不提交仓库。完整 SQL 可能包含尚未过期的会话，因此恢复后应清空 `sessions` 表并更换管理员密码。恢复前在新数据库验证，再通过 `wrangler d1 execute` 导入；不要直接覆盖已有生产数据库。R2 文件需单独备份（通过 R2 的 S3 兼容工具或逐个下载），仅导出 JSON / SQL 不包含文件本体。

建议定期备份数据库和附件，清理无引用文件前先检查所有草稿与已发布快照。Cloudflare 仍是基础设施供应商，但内容模型、后台代码和导出数据均在自己掌控之中。

## 开发与验证

```bash
npm run test:cms
npm run build
npm run preview
```

开发者可额外运行 `node tests/admin.integration.mjs` 验证本地接口。它只接受 `127.0.0.1`，默认端口 4323；先在被 Git 忽略的 `output/playwright/admin-test-credentials.json` 中放置本地测试账号的 `username`、`password`。测试生成唯一活动和图片，用生成的 `admin-test-cleanup.sql` 通过 `wrangler d1 execute DB --local --file=...` 清理活动，按 `admin-test-media.json` 中的 key 删除对应本地 R2 对象。测试结束删除凭据文件。不要使用生产账号或线上地址。

依赖 overrides 将 undici 7、devalue 5 和 grpc-js 锁定到兼容的安全补丁版本；升级 Astro / Cloudflare / Firebase 时重新审查覆盖规则，并运行构建和测试。本分支锁文件检查已无已知漏洞，不执行会降级框架的 `npm audit fix --force`。

复用现有 `normalizeContent`、内容类型、成员轮播、`EventArchiveCard`、联系方式组件和主题；新增后台由项目已有 shadcn 体系构成，没有引入新的 CMS 服务。旧 Sanity 方案保留在原分支，本分支不再启动 Studio。

参考：[Astro Cloudflare 适配器](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)、[D1](https://developers.cloudflare.com/d1/)、[R2](https://developers.cloudflare.com/r2/)。

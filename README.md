# 四川大学区块链协会网站

基于 [Dark Minimal](https://github.com/Gothsec/dark-minimal) Astro 模板改造的学生科创社团介绍站，采用暗色简约视觉，适配桌面与移动端。页面介绍协会方向、活动、发展规划、合作倡议、联盟共建、学习资源与加入方式。

> 本站为学生自建站点，仅作学术科创交流，不代表学校立场；所有分析仅用于教学，不构成投资建议，不鼓励加密资产交易。

## 技术栈

- Astro 7 静态站点
- TypeScript、React（模板中的少量交互组件）、Tailwind CSS
- Node.js 20 或更高版本
- **npm**：仓库使用 `package-lock.json` 与 `.github/workflows/ci.yml` 中的 `npm ci`。

## 本地开发

```bash
npm ci
npm run dev
```

开发服务器默认运行在 <http://localhost:4321>。构建并检查：

```bash
npm run build
npm run preview
```

`npm run build` 会先执行 `astro check`，再生成 `dist/` 静态文件。

## 导出单文件分享版

```bash
npm run share:html
```

生成 `output/share/scu-blockchain-offline.html`。将这一个文件发给他人，下载后用新版 Chrome、Edge 或 Safari 打开即可，无须启动服务器。图片、本地字体、样式、React 与 Motion 脚本均内嵌，支持离线查看、成员轮播、档案弹窗和导航；外部网站链接仍需联网。聊天软件内置预览可能禁用脚本，请选择浏览器打开。

该文件是导出时的静态快照，修改网站后重新运行命令即可更新。导出脚本复用正式构建产物，用 `es-module-lexer` 解析模块引用，再通过 import map 嵌入模块；未另写一套展示或交互。文件目前约 8.3 MiB，已保留字体与模板许可，导出产物不加入 Git。

## 开发原则

优先复用已有组件、样式与依赖；重复展示结构逐步抽成公共组件。开发前请阅读 [AGENTS.md](AGENTS.md) 和 [项目维护说明](docs/plan.md)。

## 内容维护

主题配色统一在 [`src/styles/theme.css`](src/styles/theme.css) 配置；修改顶部基础色即可同步按钮、渐变、卡片与徽章。色卡、参考来源和调整方式见 [配色说明](docs/theme.md)。

| 内容 | 文件 |
| --- | --- |
| 首页介绍、社团定位与领域标签 | `src/components/home.astro` |
| 活动方向、发展规划 | `src/components/projects.astro` |
| 合作伙伴与高校联盟倡议 | `src/components/collaboration.astro` |
| 活动回顾分类、学习资源分类 | `src/components/archive.astro` |
| 招新、合作咨询入口 | `src/components/contact.astro` |
| 锚点导航 | `src/components/nav.astro` |
| 页脚免责声明与版权 | `src/components/footer.astro` |
| 页面标题、元信息、全局设计变量 | `src/layouts/Layout.astro` |

活动照片、真实活动记录、讲义/资源链接、报名表、QQ群、公众号和合作咨询方式目前尚未提供，页面以“待补充/整理中”标示。获得协会确认后再替换占位信息；联盟学校及社团当前为意向伙伴，不应改写成已确认合作。不要提交个人隐私或未获授权的图片、Logo、联系方式。

## GitHub 与多设备协作

协会私有仓库：https://github.com/XiaoYijiang-c/scu-blockchain-website

新设备首次使用（需要有该私有仓库的访问权限）：

```bash
git clone https://github.com/XiaoYijiang-c/scu-blockchain-website.git
cd scu-blockchain-website
npm ci
npm run browser:install
npm run dev
```

每次开始修改前执行 `git pull --ff-only`；完成后提交并推送：

```bash
git add <本次修改的文件>
git commit -m "描述本次修改"
git push
```

多设备同时开发不同功能时，各自创建功能分支，通过 Pull Request 合入 `main`。切换设备前提交并推送，避免两端同时修改同一文件。依赖锁文件也需一起提交。

`origin` 指向协会仓库；本机保留模板仓库为 `upstream`，请勿向模板仓库推送协会内容。新克隆默认只包含 `origin`。

浏览器工具与配置通过 Git 同步，浏览器内核需在每台设备安装。详见 [视觉预览说明](docs/visual-preview.md)。Codex 用户级技能需在各设备单独安装；无需技能也可通过 npm 命令截图。

## 部署

项目使用 Astro `static` 输出。可在 Vercel、Netlify 或支持静态文件的托管平台部署，构建命令为 `npm run build`，输出目录为 `dist`。首次部署前需按平台确认 Node 版本（20+）。域名尚未确定，因此页面暂未设置虚构 canonical 地址。

## 模板与许可

本项目在 Dark Minimal 模板基础上修改。模板原有 MIT License（版权归 Oscar Hernandez）保存在 `LICENSE`；再分发时应保留许可证及原版权/许可声明。协会自有文案、图片等素材应由提供方确认其使用授权。模板演示内容和协会内容请以本项目现行文件为准。

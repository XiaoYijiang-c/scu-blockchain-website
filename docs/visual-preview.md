# 浏览器视觉预览与跨设备安装

项目锁定 Playwright CLI 版本，配置位于 `.playwright/cli.config.json`，使用无界面 Chromium，默认视口 1440 × 1000。不包含本机绝对路径。

## 新设备准备

```bash
npm ci
npm run browser:install
```

浏览器内核由与 CLI 配套的 Playwright 下载，避免单独安装最新版导致内核版本不匹配。Linux 如提示缺少系统库，按安装器提示安装相应系统依赖。

## 截图流程

先运行 `npm run dev -- --host 127.0.0.1`，使用终端实际输出的端口（可能不是 4321）。另开终端：

```bash
npm run browser -- open http://127.0.0.1:4321
npm run browser -- snapshot
npm run browser -- screenshot --filename=output/playwright/desktop.png
npm run browser -- resize 390 844
npm run browser -- screenshot --filename=output/playwright/mobile.png
npm run browser -- console error
npm run browser -- close
```

截图前创建 `output/playwright` 目录。完成后停止本次预览服务。截图和浏览器会话已加入 Git 忽略规则。

## Codex 技能

`playwright` 和 `screenshot` 为用户级技能，不在项目仓库中。在新设备让 Codex 安装 openai/skills 官方同名技能即可。即使尚未安装技能，也可以用以上项目命令驱动浏览器，并用图像查看工具检查截图。

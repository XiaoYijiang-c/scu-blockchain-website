# 主题配色

唯一的界面配色入口是 [`src/styles/theme.css`](../src/styles/theme.css)。修改顶部基础颜色即可，布局样式、shadcn、Magic UI、网络插画及首页徽章会共用这些变量。

| 配置 | 当前颜色 | 用途 |
| --- | --- | --- |
| `--theme-primary` | `#8B5CF6` 电光紫 | 主色、边缘、光晕 |
| `--theme-secondary` | `#22D3EE` 亮青蓝 | 标题渐变、焦点、hover、徽章反光 |
| `--theme-accent` | `#F472B6` 玫粉 | 少量环境光点缀 |
| `--theme-background` | `#080B16` 深海军蓝 | 页面背景 |
| `--theme-surface` | `#11182B` | 卡片、导航底色 |
| `--theme-text` | `#F1F5FF` | 主要文字 |
| `--theme-muted` | `#A8B3CF` | 正文、次要说明 |

透明度、柔和色阶、边框和渐变由基础色自动派生。`globals.css` 负责 Tailwind/shadcn 变量映射，`design.css` 只消费主题变量；不要在组件里重新定义主题颜色。

例如把 `--theme-primary` 改为 `#6366F1`，`--theme-secondary` 改为 `#34D399`，即可尝试靛蓝与薄荷绿。换色后检查文字和按钮对比度，并用桌面及手机视口预览。

Logo 红白识别色由 `--logo-red`、`--logo-white` 独立管理。徽章 SVG 从资源文件内联到首页，因此金属边框可以继承主题。独立打开 SVG 时使用文件中的默认色；纯 Logo 资源保留固定品牌色。

## 设计参考

- [Radix Colors](https://www.radix-ui.com/colors)：界面色彩系统。
- [Radix 色阶用途](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)：按背景、交互状态、边框、文字划分颜色职责。本项目采用这一组织方式，配色为自行组合。
- [Realtime Colors](https://www.realtimecolors.com/)：在页面中预览配色与对比度。
- [shadcn Theming](https://ui.shadcn.com/docs/theming)：通过 CSS 语义变量统一组件主题。

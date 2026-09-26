# 🧰 VueBox - Web 工具箱

一个基于 **Vue 3 + TypeScript + Vite** 的在线 Web 工具箱，集合各种实用小工具。

## ✨ 特性

- ⚡ **Vite** 驱动，极速开发体验
- 🧩 **模块化架构**——添加新工具只需 2 步
- 🔍 **全局搜索**——按标题、描述、关键词模糊匹配
- 🎨 **深色模式**——自动跟随系统配色
- 📱 **响应式布局**——适配桌面端与移动端
- 🚀 **路由懒加载**——按需加载工具组件

## 📁 项目结构

```
vuebox/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── public/                     # 静态资源
└── src/
    ├── main.ts                 # 应用入口
    ├── App.vue                 # 根组件
    ├── style.css               # 全局样式 & CSS 变量
    ├── types/
    │   └── tool.ts             # 工具 & 分类的类型定义
    ├── config/
    │   ├── categories.ts       # 工具分类配置
    │   └── tools.ts            # ⭐ 工具注册表（核心）
    ├── router/
    │   └── index.ts            # 路由（自动从 tools.ts 生成）
    ├── composables/
    │   └── useToolSearch.ts    # 搜索 composable
    ├── layouts/
    │   └── MainLayout.vue      # 主布局（分类菜单 + 面包屑 + 内容）
    ├── components/
    │   ├── ToolCard.vue        # 工具卡片组件
    │   └── ToolWrapper.vue     # 工具页面包裹组件（标题 + 内容）
    └── views/
        ├── HomePage.vue        # 首页（搜索 + 分类列表）
        ├── NotFound.vue        # 404 页面
        └── tools/              # ⭐ 工具组件目录
            ├── text/           # 文本处理类
            │   └── TextLength.vue
            ├── dev/            # 开发工具类
            │   └── JsonFormatter.vue
            └── other/          # 生活工具组件
```

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 运行全部工具回归测试（Node.js 22.6+）
npm test

# 预览生产版本
npm run preview
```

## 📝 如何添加新工具

### 文本文件规范

新增及修改的文本文件统一使用 CRLF 行尾，遵循 `.editorconfig`、`.gitattributes` 和根目录 `AGENTS.md`。运行 `npm run fix:eol` 修复，再运行 `npm run check:eol` 检查；检查覆盖 Git 跟踪文件和未忽略的新增文件，跳过已删除文件、二进制及非 UTF-8 内容。Git 索引中的文本通常仍以 LF 规范化存储，工作区使用 CRLF。

只需 **2 步**，无需修改路由或其他配置文件：

### 第 1 步：创建工具组件

在 `src/views/tools/<category>/` 下创建 Vue 组件，使用 `ToolWrapper` 包裹：

```vue
<script setup lang="ts">
import ToolWrapper from '@/components/ToolWrapper.vue'
// 你的工具逻辑...
</script>

<template>
  <ToolWrapper title="工具名称" description="工具描述">
    <!-- 你的工具 UI -->
  </ToolWrapper>
</template>
```

### 第 2 步：注册工具

在 `src/config/tools.ts` 中添加一条记录：

```ts
{
  name: 'my-tool',                  // 路由 name（唯一）
  title: '我的工具',                  // 显示名称
  description: '这是一个示例工具',      // 描述
  category: 'text',                 // 分类 key（见 categories.ts）
  icon: '🔧',                       // 图标
  keywords: ['关键词1', '关键词2'],    // 搜索关键词
  path: '/tools/text/my-tool',      // 路由路径
  component: () => import('@/views/tools/text/MyTool.vue'),  // 懒加载组件
}
```

完成！路由会自动注册，首页会自动展示新工具卡片。

## 🏷️ 工具分类

| 分类 Key   | 名称     | 说明                           |
| ---------- | -------- | ------------------------------ |
| `text`     | 文本处理 | 文本格式化、编解码、比较等     |
| `image`    | 图片工具 | 图片压缩、转换、裁剪等         |
| `dev`      | 开发工具 | JSON 格式化、正则测试等        |
| `encrypt`  | 加密解密 | MD5、Base64、AES 等            |
| `convert`  | 转换工具 | 进制转换、单位换算、颜色转换等 |
| `generate` | 生成工具 | UUID、密码、二维码等生成工具   |
| `other`    | 其他工具 | 未归类的实用小工具             |

如需新增分类，在 `src/config/categories.ts` 中添加即可。

## 🛠️ 内置示例工具

| 分类 | 工具 |
| --- | --- |
| 编码 / 格式化 | 时间戳转换、Base64 编解码、图片 Base64、JSON 格式化、JWT 解析、URL 编解码 |
| 开发辅助 | 进制转换、颜色转换、Cron 表达式、UUID 生成、SQL 格式化、时区转换、HTTP 状态码速查 |
| 文本处理 | 文本差异对比、文本字数统计、正则表达式测试 |
| 图片 | 图片取色器 |
| 数据处理 | Excel 转 JSON |
| 加密 / 哈希 | 哈希计算、随机密码生成 |
| 生活工具 | 世界时钟、朱富贵火锅菜价计算器 |

除朱富贵火锅计算器以外，工具页面共用左侧两级菜单，所有分类直接展开，当前工具高亮；顶部面包屑可返回首页或分类列表。手机端通过“切换工具”展开菜单。朱富贵火锅计算器通过 `standalone: true` 使用原独立页面，不显示工具箱顶栏、菜单和面包屑。分类页入口为 `/category/:category`，分类键见 `src/config/categories.ts`。

每个工具都有独立路由。保留旧编码与时间工具箱中仍支持的子工具链接跳转；火锅工具使用 `/zfg`，旧 `/other/hotpot-calculator` 链接也可跳转到此处。已下线工具的旧链接显示 404。

### JSON 在线格式化

入口：`/dev/json-formatter`。纯浏览器本地处理，输入和结果支持语法高亮编辑，PC 双栏、移动端上下排列。提供格式化（2/4 空格或 Tab）、压缩、中文行列错误提示与定位、节点折叠/展开、转义/反转义、复制和清空。

默认识别包装为 JSON 字符串的对象/数组及无外层引号的转义文本，可关闭自动识别以保留字符串类型。转义针对原始输入生成完整 JSON 字符串，反转义每次解码一层；复制始终读取结果区当前文本。语法解析使用 `jsonc-parser` 的严格 JSON 选项，保留大整数、数字原文、键顺序与重复键，不接受注释和尾逗号。

运行 `npm run test:json` 验证精度、错误定位、转义往返、高亮安全性与树形虚拟滚动。支持最多 100 万字符、128 层嵌套；树形视图只挂载可见行，支持全部展开/折叠与长值详情。支持本地导入 JSON 文件，可用 `docs/longtest.json` 验证长文本性能。

### Cron 表达式生成器

入口：`/dev/cron-generator`。支持秒、分、时、日、月、周的任意值、指定值、范围和间隔配置，输入表达式后自动同步表单。默认预览未来 10 次执行时间，可调整为 1–50 次，并提供常用模板与复制反馈。

- 五位格式为 `分 时 日 月 周`，六位在最前面添加秒；从五位切换到六位补入 `0`，反向切换会丢弃秒规则。
- 支持数字与 `* , - /`，星期 `0/7` 为周日。日期和星期均被限定时采用 Unix cron 的“或”关系；不支持 Quartz 特殊字符、年份或英文别名。
- 使用 [cron-parser](https://github.com/harrisiirak/cron-parser) 在 Web Worker 中计算，按浏览器本地时区预览，不实际执行任务。
- `npm run test:cron` 运行解析、模板、执行时间及边界测试（需要 Node.js 22.6+）。

## 本地运算与验证

- Excel 转 JSON（`/data/excel-to-json`）：本地导入 `.xlsx` / `.xls`，选择工作表，配置对象数组或二维数组、起始行、值类型、空行和缩进。日期按显示文本输出，公式使用已有缓存结果；重复和空表头自动处理，支持复制和下载完整 JSON。通过 Worker 解析，可取消；文件最大 10 MiB，单表最多 50000 行、256 列、50 万格。采用 [SheetJS 官方分发版本](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/) 0.20.3，打包进本地 Worker，运行时不请求外部 CDN。
- 图片取色器（`/image/color-picker`）：选择或拖入本地图片，按原图像素取色并复制 HEX、RGB(A)、HSL(A)，保留透明度和最近 12 色。支持方向键微调取色位置，移动端可轻触取色；单张最大 10 MiB、2400 万像素，动图取加载时的一帧。
- 图片 Base64（`/dev/image-base64`）：选图或拖入文件，输出完整 Data URL 或纯 Base64；支持反向还原、预览和下载。单张图片最大 5 MiB，支持 PNG、JPEG、GIF、WebP、BMP、ICO、AVIF、SVG；预览能力取决于浏览器。
- HTTP 状态码速查（`/dev/http-status`）：64 个登记状态码的本地快照，支持编号、中英文关键词、1xx–5xx 分类和常用筛选。数据按 IANA 注册表核对，保留、弃用与临时登记状态有明确说明。
- 随机密码生成（`/dev/password-generator`）：4–128 位、一次 1–100 条，可选大小写、数字、符号，支持排除易混淆字符、隐藏显示与复制。使用 Web Crypto 安全随机数及拒绝采样，每条密码覆盖全部所选类型，不写入本地存储。

所有工具均为中文界面、浏览器本地处理，工具注册表同时驱动首页、搜索、侧栏和路由。生产部署入口带 `/toolbox/` 前缀。

文本对比每侧最多 100 万字符、50,000 行，结果列表只渲染可见窗口；长行可点击查看全文。正则、差异、SQL 和 Cron 使用 Worker 计算，切换离开工具页时释放组件资源。JWT 只解析 Header/Payload 与时间声明，不验证签名。

依赖：`diff` 用于文本差异，`sql-formatter` 用于 SQL 排版；摘要与 UUID 使用浏览器 Web Crypto。运行 `npm test` 验证保留工具的运算逻辑，运行 `npm run build` 进行类型检查与生产打包。

## 📦 技术栈

- [Vue 3](https://vuejs.org/) - 渐进式 JavaScript 框架
- [TypeScript](https://www.typescriptlang.org/) - 类型安全
- [Vite](https://vite.dev/) - 下一代前端构建工具
- [Vue Router 4](https://router.vuejs.org/) - 官方路由

## 📄 License

MIT

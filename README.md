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
    │   └── MainLayout.vue      # 主布局（顶栏 + 内容 + 底栏）
    ├── components/
    │   ├── ToolCard.vue        # 工具卡片组件
    │   └── ToolWrapper.vue     # 工具页面包裹组件（标题 + 返回）
    └── views/
        ├── HomePage.vue        # 首页（搜索 + 分类列表）
        ├── NotFound.vue        # 404 页面
        └── tools/              # ⭐ 工具组件目录
            ├── text/           # 文本处理类
            │   └── TextLength.vue
            ├── dev/            # 开发工具类
            │   └── JsonFormatter.vue
            ├── image/          # 图片工具类
            ├── encrypt/        # 加密解密类
            ├── convert/        # 转换工具类
            └── generate/       # 生成工具类
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

| 工具              | 分类     | 功能                                           |
| ----------------- | -------- | ---------------------------------------------- |
| 文本字数统计      | 文本处理 | 统计字符数、单词数、行数等                     |
| JSON 格式化       | 开发工具 | JSON 格式化、压缩、校验                        |
| Cron 表达式生成器 | 开发工具 | 可视化配置、5/6 位切换、校验、未来执行时间预览 |

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

## 新增开发工具

均为中文界面、浏览器本地处理，注册表自动接入首页搜索。生产部署入口带 `/toolbox/` 前缀。

| 工具               | 入口                   | 主要功能                                                                |
| ------------------ | ---------------------- | ----------------------------------------------------------------------- |
| 文本差异对比       | `/text/diff`           | 文件导入、逐行/行内高亮、忽略空白/大小写/换行差异、仅看差异、复制报告   |
| 正则测试           | `/dev/regex-tester`    | JavaScript 正则、捕获组、匹配高亮、替换预览；后台计算，2 秒超时终止     |
| SQL 格式化         | `/dev/sql-formatter`   | MySQL、PostgreSQL、SQLite、SQL Server、Oracle、标准 SQL、BigQuery、Hive |
| JWT 解析           | `/dev/jwt-viewer`      | 本地解码 Header/Payload、时间声明；仅解析，不验证签名或信任身份         |
| JSON / YAML 互转   | `/dev/yaml-converter`  | YAML 1.2 双向转换；拒绝循环别名、不安全整数、非字符串键                 |
| JSON 转 TypeScript | `/dev/json-types`      | 嵌套结构、数组联合类型、可选属性、只读模式                              |
| 哈希计算           | `/dev/hash-calculator` | 文本/文件 SHA-256、384、512、1；摘要比对                                |
| 文本批量处理       | `/text/batch`          | 按行去重、自然排序、去空行、命名转换、前后缀                            |
| 进制转换           | `/dev/radix-converter` | 2–36 进制、BigInt 精确整数、正负号和进制前缀                            |
| 颜色转换           | `/dev/color-converter` | HEX/RGB/HSL、透明度、文字背景预览与对比度                               |

文本对比每侧最多 100 万字符、50,000 行，结果列表只渲染可见窗口；长行可点击查看全文。新增的正则、差异、文本批处理、SQL、YAML、类型推断通过 Web Worker 隔离运算，切换输入或离开页面会终止旧任务。摘要文件限制为 20 MiB。

测试覆盖正常转换、非法输入、精度、随机差异往返、大文本与注入文本。长 JSON 测试优先使用本地 `docs/longtest.json`；没有该文件时自动生成嵌套样本，无需提交个人数据。新增和修改文件保持 CRLF。

依赖：`diff` 用于文本差异，`sql-formatter` 用于 SQL 排版，`yaml` 用于 YAML 解析与序列化；摘要使用浏览器 Web Crypto。

## 📦 技术栈

- [Vue 3](https://vuejs.org/) - 渐进式 JavaScript 框架
- [TypeScript](https://www.typescriptlang.org/) - 类型安全
- [Vite](https://vite.dev/) - 下一代前端构建工具
- [Vue Router 4](https://router.vuejs.org/) - 官方路由

## 📄 License

MIT

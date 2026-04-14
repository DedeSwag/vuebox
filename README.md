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

| 分类 Key    | 名称     | 说明                          |
| ---------- | -------- | ----------------------------- |
| `text`     | 文本处理 | 文本格式化、编解码、比较等      |
| `image`    | 图片工具 | 图片压缩、转换、裁剪等          |
| `dev`      | 开发工具 | JSON 格式化、正则测试等         |
| `encrypt`  | 加密解密 | MD5、Base64、AES 等            |
| `convert`  | 转换工具 | 进制转换、单位换算、颜色转换等   |
| `generate` | 生成工具 | UUID、密码、二维码等生成工具     |
| `other`    | 其他工具 | 未归类的实用小工具              |

如需新增分类，在 `src/config/categories.ts` 中添加即可。

## 🛠️ 内置示例工具

| 工具             | 分类     | 功能                       |
| --------------- | -------- | -------------------------- |
| 文本字数统计      | 文本处理 | 统计字符数、单词数、行数等   |
| JSON 格式化      | 开发工具 | JSON 格式化、压缩、校验      |

## 📦 技术栈

- [Vue 3](https://vuejs.org/) - 渐进式 JavaScript 框架
- [TypeScript](https://www.typescriptlang.org/) - 类型安全
- [Vite](https://vite.dev/) - 下一代前端构建工具
- [Vue Router 4](https://router.vuejs.org/) - 官方路由

## 📄 License

MIT

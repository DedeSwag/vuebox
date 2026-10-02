# 仓库编辑规范

- 新增和修改的文本文件必须使用 CRLF（`\r\n`）行尾，文件末尾保留一个换行。禁止混用 LF 和 CRLF。
- 使用 UTF-8 编码；修改已有文件时保留其 BOM 状态，不做无关的编码转换。
- 遵循 `.editorconfig` 和 `.gitattributes`；图片、字体、工作簿等二进制文件不得进行行尾转换。
- `apply_patch`、代码生成器或脚本可能写入 LF。完成文件编辑后，运行 `npm run fix:eol`，再运行 `npm run check:eol`，确认通过后再结束任务。
- 行尾规范调整不得改变业务逻辑，不要执行 Git 暂存、提交或全局配置修改，除非用户明确要求。

# 工具开发规范（人工与 AI 均须遵循）

- 新增、修改工具前，阅读 [工具开发指南](docs/tool-development.md)，复用现有布局、交互和计算基础设施。
- 除独立的朱富贵工具外，界面颜色统一引用 `src/assets/theme.css` 的变量。禁止在组件内写死主题色、状态色、阴影颜色；用户输入、图片像素等业务颜色除外。
- 组件样式放入 `@layer components`；公共按钮由 `src/assets/controls.css` 的 `controls` 层管理。主操作用 `button-primary`，其他操作用默认实心按钮；不要在组件中重写按钮背景、文字色和交互色。
- 转换、计算、生成默认由明确的按钮点击或表单提交执行。初始不生成结果，载入示例只填输入；改变计算输入或选项立即清除旧结果并取消旧任务。可复用 `useManualResult`、`useWorkerTask`。
- 世界时钟、搜索筛选、编辑器语法提示、图片取色预览和已有结果的显示格式允许实时反馈；这些例外不得用于恢复转换或计算结果的自动生成。
- 新工具在 `src/config/tools.ts` 注册，复用 `DevTool` / `ToolWrapper`；计算逻辑放入 `src/utils`，中文界面，浏览器本地处理，不上传、不记录用户输入。
- 完成后运行相关测试与 `npm run build`，检查浅色/深色及桌面/移动端的交互，最后运行 `npm run fix:eol` 和 `npm run check:eol`。不要覆盖已有暂存内容。

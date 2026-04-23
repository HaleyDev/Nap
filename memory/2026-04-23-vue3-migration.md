# 会话记录：Vue 3 前端迁移 & Docker 部署

- **日期**：2026-04-23
- **Agent**：Qoder AI Assistant
- **目标**：将项目前端从 Jinja2 + Vanilla JS 迁移到 Vue 3 + TypeScript + Vuetify 3，并集成 Docker 多阶段构建

## 完成的工作

- [x] 初始化 Vue 3 + TypeScript 项目（Vite 模板）
- [x] 安装 Vuetify 3、Vue Router 4、@mdi/font、vite-plugin-vuetify
- [x] 配置 Vite（vuetify 插件、@ 路径别名、API 代理、构建输出到 app/templates）
- [x] 创建 TypeScript 类型定义（Recipe、RecipeCreate 等）
- [x] 创建 API 层（recipesApi — wish/recommend/CRUD/batch/upload）
- [x] 创建 Vue composables（useAudio 音效、useStarCanvas 星空背景、useHistory 历史记录）
- [x] 实现 WishView.vue（抽奖页 — 配置表单、卡片翻转动画、详情弹窗、历史面板）
- [x] 实现 AdminView.vue（管理页 — 菜谱表单、图片上传、批量导入、列表管理）
- [x] 配置 Vue Router（/ → WishView, /admin → AdminView）
- [x] 改写 app/main.py 为 SPA 托管模式（移除 Jinja2）
- [x] 改写 Dockerfile 为多阶段构建（node:20-slim + python:3.11-slim）
- [x] 修改 docker-compose.yml 添加 templates 卷映射
- [x] 修复 api.py f-string 引号语法错误
- [x] 修复 Docker 数据库认证问题（创建 .env 文件）
- [x] 创建 .agent.md、docs/、memory/、plans/ 项目管理结构

## 修改的文件

| 文件路径 | 操作 | 说明 |
|----------|------|------|
| `frontend/` (整个目录) | 新增 | Vue 3 + TS + Vuetify 3 前端项目 |
| `frontend/vite.config.ts` | 新增 | Vite 配置（vuetify 插件、代理、输出目录） |
| `frontend/src/main.ts` | 新增 | 应用入口（Vuetify 暗色主题、路由） |
| `frontend/src/types/index.ts` | 新增 | 共享 TypeScript 类型 |
| `frontend/src/api/recipes.ts` | 新增 | API 请求封装层 |
| `frontend/src/views/WishView.vue` | 新增 | 抽奖主页面 |
| `frontend/src/views/AdminView.vue` | 新增 | 管理后台页面 |
| `frontend/src/composables/useAudio.ts` | 新增 | Web Audio API 音效 |
| `frontend/src/composables/useStarCanvas.ts` | 新增 | Canvas 星空背景 |
| `frontend/src/composables/useHistory.ts` | 新增 | LocalStorage 历史记录 |
| `frontend/src/style.css` | 新增 | 自定义 CSS（动画、卡片翻转等） |
| `app/main.py` | 修改 | 改为 SPA 托管，移除 Jinja2 |
| `app/routers/api.py` | 修改 | 修复 L49 f-string 引号问题 |
| `Dockerfile` | 重写 | 多阶段构建（前端编译 + 后端运行） |
| `docker-compose.yml` | 修改 | 添加 templates 卷映射 |
| `.env` | 新增 | 数据库连接配置（DB_HOST=db） |
| `.gitignore` | 修改 | 添加 app/templates/、frontend/node_modules/ |

## 遇到的问题与解决方案

### 问题 1：TypeScript 编译 baseUrl 弃用警告
- **原因**：TypeScript 7.0 弃用了 `baseUrl` 配置项
- **解决**：在 tsconfig.app.json 中添加 `"ignoreDeprecations": "6.0"`

### 问题 2：v-dialog v-model 类型不匹配
- **原因**：`v-model` 绑定 `Recipe | null` 但 v-dialog 期望 `boolean`
- **解决**：添加独立的 `showModal: boolean` ref，将 dialog 绑定到 boolean 值

### 问题 3：Python f-string 语法错误（api.py L49）
- **原因**：`f"当前分类"{normalized_category}"还没有可抽取的菜谱"` — 双引号冲突导致 f-string 提前关闭
- **解决**：将外层引号改为单引号 `f'当前分类"{normalized_category}"还没有可抽取的菜谱'`

### 问题 4：Docker PostgreSQL 认证失败
- **原因**：缺少 `.env` 文件，docker-compose 中的 `${DB_USER}` 等变量为空
- **解决**：从 `.env.example` 创建 `.env`，设置 `DB_HOST=db`

## 关键决策

- 选择 Vuetify 3 作为 UI 组件库（用户指定）
- Vue 构建输出到 `app/templates/` 由 FastAPI 直接托管（无 Nginx）
- Docker 多阶段构建：Stage 1 用 node:20-slim 编译前端，Stage 2 用 python:3.11-slim 运行后端
- 保留原有 CSS 动画（3D 卡片翻转、流星加载、Canvas 星空、光泽偏移）

## 遗留事项

- [ ] 验证 Docker 容器是否能正常启动（用户需执行 `docker compose down -v && docker compose up --build`）
- [ ] 移动端深度适配优化
- [ ] plane.md 中的优化计划部分尚有未完成项

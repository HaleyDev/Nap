# 项目开发计划书：Metis Gastronomy Terminal (MGT)

---

## 1. 项目背景 (Project Background)

开发者（User）是一名资深嵌入式与后端工程师，追求极简、工业风及逻辑控制。

本项目旨在解决 **"周末吃什么"** 的决策焦虑，通过将二次元祈愿（Gacha）机制引入日常烹饪决策，建立一套**私有化、游戏化**的食谱管理与随机抽取系统。

该项目是 **Metis 个人数字助理生态**的一个模块，未来可能集成至 AI Agent 的工具链中。

---

## 2. 核心需求 (Requirements)

| 需求项 | 说明 |
| --- | --- |
| **食谱抽奖** | 支持"祈愿 1 次"或"祈愿 10 次"，具备稀有度概率分布（3/4/5 星） |
| **工业风 UI** | 前端采用暗黑工业风，配合流星与卡片翻转动画，且必须兼容手机移动端 |
| **一体化部署** | 由 FastAPI 直接挂载静态资源，不使用 Nginx，追求部署结构最简化 |
| **私有库管理** | 提供独立的管理页面（Admin）用于录入和维护食谱数据 |

---

## 3. 技术栈定义 (Technical Stack)

| 维度 | 技术选型 | 备注 |
| --- | --- | --- |
| 后端框架 | FastAPI (Python 3.10+) | 异步架构，负责 API 及静态文件托管 |
| 数据库 | PostgreSQL 15+ | 存储于内网服务器 `10.99.65.75` |
| 持久层 | SQLAlchemy 2.0 (Async) | 使用 `asyncpg` 驱动 |
| 前端 | HTML5 + Tailwind CSS + Vanilla JS | 无重型框架，保证轻量与响应式 |
| 数据交换 | Pydantic V2 | 强类型数据验证 |

---

## 4. 数据库建模 (Database Schema)

- **目标数据库：** `metis`
- **表名：** `recipes`

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `id` | SERIAL (PK) | 唯一标识 |
| `name` | VARCHAR(100) | 菜名 |
| `category` | VARCHAR(20) | 类型：荤菜、素菜、汤、主食 |
| `rarity` | INTEGER | 稀有度：3 (Blue), 4 (Purple), 5 (Gold) |
| `img_url` | TEXT | 食谱图片地址，可为外链，也可为 FastAPI 本地上传后的静态路径 |
| `description` | TEXT | 菜品风味简述 |
| `ingredients` | JSONB | 食材列表，格式：`["食材A 500g", "食材B"]` |
| `steps` | JSONB | 烹饪要点，格式：`["步骤1", "步骤2"]` |
| `last_cooked` | TIMESTAMP | 上次抽中的时间 |

---

## 5. 核心逻辑与 API 规范 (Logic & API)

### A. 抽奖概率算法 (Gacha Logic)

后端需实现基于权重的随机抽取：

- **概率分布：** ★★★★★ 5 星（2%）、★★★★ 4 星（10%）、★★★ 3 星（88%）
- **保底机制（可选）：** 10 连抽必出一个 4 星或以上
- **结果返回：** 一次性返回包含 $n$ 个食谱对象的 List

### B. API 接口定义

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/` | 返回 `index.html`（抽奖页） |
| `GET` | `/admin` | 返回 `admin.html`（录入页） |
| `GET` | `/api/v1/wish?count={int}` | 获取抽奖结果 |
| `POST` | `/api/v1/uploads/recipe-image` | 上传食谱图片，返回可落库的静态图片路径 |
| `POST` | `/api/v1/recipes` | 录入新菜谱 |
| `GET` | `/api/v1/recipes` | 获取全部菜谱列表 |

---

## 6. 前端 UI/UX 要求 (Frontend Design)

### 响应式设计 (Mobile Friendly)

- 在手机端，卡片容器 `cards-wrapper` 需支持自动换行或横向滑动
- 操作按钮在小屏幕上自动调整为全宽展示

### 视觉风格

- **背景：** 深空黑 / 暗灰色调，保持 `Noto Sans SC` 字体
- **动画：** 保持 CSS 3D 翻转效果及 Canvas 星空背景

### 交互逻辑

- 点击卡片弹出 Detail Modal
- Modal 在手机端高度自适应，内容过多时内部滚动

---

## 7. 实施计划 (Implementation Phases)

### 第一阶段：后端基础设施

- [ ] 根据 `.env` 配置建立异步数据库连接
- [ ] 实现 SQLAlchemy 模型与 `recipes` 表自动迁移
- [ ] 编写 FastAPI 静态目录挂载代码（`app.mount("/static", ...)`）

### 第二阶段：核心 API 开发

- [ ] 开发 `wish` 路由，实现概率抽取逻辑
- [ ] 开发 `recipes` CRUD 接口，支持 JSONB 格式的食材和步骤存取

### 第三阶段：前端集成与适配

- [ ] 将原始 HTML 中的模拟数据 `RECIPE_POOL` 替换为异步 Fetch 请求
- [ ] 开发 `admin.html` 页面，实现动态添加食材行和步骤行
- [ ] 为 Admin 页面补充食谱图片上传与预览能力
- [ ] 使用 Tailwind 的 `sm:` / `md:` / `lg:` 前缀完成全设备适配

---

## 8. 环境配置 (.env)

```ini
DB_USER=xpeng
DB_PASSWORD=123456
DB_HOST=10.99.65.75
DB_PORT=5432
DB_NAME=metis
DB_ASYNC_URL=postgresql+asyncpg://xpeng:123456@10.99.65.75:5432/metis
```

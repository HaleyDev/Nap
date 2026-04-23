# Metis Gastronomy Terminal (MGT) — 项目详细介绍

> 一个游戏化的食谱管理与随机抽取系统，将二次元祈愿（Gacha）机制引入日常烹饪决策。

---

## 1. 项目概述

**Metis Gastronomy Terminal** 是一个私有化的食谱管理与"抽卡"系统，核心功能是从用户的个人菜谱库中，按照稀有度概率随机抽取菜品灵感，解决"今天吃什么"的决策焦虑。

该项目属于 **Metis 个人数字助理生态**的一个模块。

### 核心特性

- **祈愿抽取**：支持 1~20 次抽取，3/4/5 星稀有度概率分布（88%/10%/2%），10 连抽保底机制
- **分类筛选**：按菜品分类（荤菜/素菜/汤/主食）和关键字筛选
- **菜谱管理**：完整的 CRUD、图片上传、JSON 批量导入
- **暗黑工业风 UI**：Canvas 星空背景、3D 卡片翻转动画、流星加载效果、Web Audio 音效
- **一体化部署**：FastAPI 直接托管前端，无 Nginx，Docker 一键部署

---

## 2. 技术架构

```
┌─────────────────────────────────────────────┐
│                   Browser                    │
│  Vue 3 + TypeScript + Vuetify 3 (SPA)       │
└──────────────────┬──────────────────────────┘
                   │ HTTP (fetch API)
                   ▼
┌─────────────────────────────────────────────┐
│              FastAPI (Python 3.11)            │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │ Routers  │  │ Services │  │ Static     │ │
│  │ (api.py) │  │ (gacha)  │  │ Files      │ │
│  │          │  │ (uploads)│  │ (SPA+imgs) │ │
│  └────┬─────┘  └────┬─────┘  └────────────┘ │
│       │              │                        │
│       ▼              ▼                        │
│  ┌──────────────────────────┐                │
│  │  SQLAlchemy 2.0 (Async)  │                │
│  │       + asyncpg           │                │
│  └────────────┬─────────────┘                │
└───────────────┼──────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────┐
│            PostgreSQL 13+                    │
│         (Docker Container)                   │
└─────────────────────────────────────────────┘
```

### 技术栈详情

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Vue 3 (Composition API) | ^3.x |
| 前端语言 | TypeScript | ^5.x |
| UI 组件库 | Vuetify 3 | ^3.x |
| 构建工具 | Vite | ^6.x |
| 后端框架 | FastAPI | ≥0.115 |
| ORM | SQLAlchemy 2.0 (Async) | ≥2.0 |
| 数据库驱动 | asyncpg | ≥0.30 |
| 数据验证 | Pydantic V2 + pydantic-settings | ≥2.8 |
| 数据库 | PostgreSQL | 13+ |
| 容器化 | Docker (multi-stage) | — |

---

## 3. 目录结构

```
Nap/
├── .agent.md                  # Agent 工作规范
├── .env                       # 环境变量（不入 Git）
├── .env.example               # 环境变量模板
├── .gitignore
├── Dockerfile                 # 多阶段构建
├── docker-compose.yml         # 服务编排
├── requirements.txt           # Python 依赖
│
├── docs/                      # 项目文档
│   ├── project-overview.md    # 本文件
│   └── api-reference.md       # API 接口文档
│
├── memory/                    # Agent 会话历史记录
│   └── YYYY-MM-DD-xxx.md
│
├── plans/                     # 需求计划文件
│   └── YYYY-MM-DD-xxx.md
│
├── frontend/                  # Vue 3 前端源码
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.ts            # 应用入口（Vuetify 初始化、路由）
│       ├── App.vue            # 根组件
│       ├── style.css          # 全局自定义 CSS
│       ├── types/
│       │   └── index.ts       # TypeScript 类型定义
│       ├── api/
│       │   └── recipes.ts     # API 请求层
│       ├── composables/
│       │   ├── useAudio.ts    # Web Audio 音效
│       │   ├── useStarCanvas.ts # Canvas 星空背景
│       │   └── useHistory.ts  # LocalStorage 历史记录
│       └── views/
│           ├── WishView.vue   # 抽奖主页面
│           └── AdminView.vue  # 管理后台页面
│
└── app/                       # FastAPI 后端
    ├── __init__.py
    ├── main.py                # 应用入口（挂载路由、静态文件、SPA）
    ├── config.py              # pydantic-settings 配置
    ├── database.py            # SQLAlchemy 异步引擎 + Session
    ├── models.py              # ORM 模型定义
    ├── schemas.py             # Pydantic 请求/响应 Schema
    ├── routers/
    │   └── api.py             # 所有 API 路由
    ├── services/
    │   ├── gacha.py           # 抽奖核心逻辑
    │   └── uploads.py         # 图片上传服务
    ├── static/
    │   └── uploads/           # 用户上传的菜谱图片
    └── templates/             # Vue 构建输出（.gitignore）
        ├── index.html
        └── assets/
```

---

## 4. 数据模型

### recipes 表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTO_INCREMENT | 唯一标识 |
| `name` | VARCHAR(100) | NOT NULL, INDEX | 菜名 |
| `category` | VARCHAR(20) | NOT NULL, INDEX | 分类：荤菜/素菜/汤/主食 |
| `rarity` | INTEGER | NOT NULL, INDEX | 稀有度：3(蓝)/4(紫)/5(金) |
| `img_url` | TEXT | NOT NULL | 图片地址（本地路径或外链） |
| `keywords` | JSONB | NOT NULL, DEFAULT [] | 关键描述词列表 |
| `ingredients` | JSONB | NOT NULL | 食材列表 |
| `last_cooked` | TIMESTAMP(tz) | NULLABLE | 上次被抽中的时间 |
| `created_at` | TIMESTAMP(tz) | NOT NULL, DEFAULT now() | 创建时间 |

---

## 5. 核心业务逻辑

### 5.1 抽奖算法（Gacha）

- **概率分布**：5 星 2%、4 星 10%、3 星 88%（可通过环境变量配置）
- **抽取流程**：
  1. 查询数据库，按分类过滤
  2. 若有关键字，按食材和描述词匹配
  3. 按稀有度分组
  4. 按权重随机选择稀有度，再从该稀有度池中随机选一道
  5. 重复 n 次
- **保底机制**：10 连抽时，若全部为 3 星，最后一张替换为 4 星或 5 星
- **副作用**：被抽中的菜谱会更新 `last_cooked` 时间戳

### 5.2 图片上传

- 支持格式：JPG、PNG、WEBP、GIF
- 大小限制：5MB（可配置）
- 存储路径：`app/static/uploads/recipe-{uuid}.{ext}`
- 文件名使用 UUID 防冲突，先写入临时文件再原子重命名
- 更新菜谱图片时自动删除旧的本地图片

---

## 6. 前端架构

### 6.1 路由

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | WishView.vue | 抽奖主页面 |
| `/admin` | AdminView.vue | 管理后台 |

### 6.2 主要组件

**WishView.vue** — 抽奖页
- 配置视图：分类选择（v-select）、关键字输入、数量滑块（1-20）
- 加载动画：流星效果（颜色随最高稀有度变化）
- 结果视图：3D 翻转卡片逐张揭示 + 音效
- 详情弹窗：点击卡片查看食材和关键词
- 历史面板：显示确认过的选择记录

**AdminView.vue** — 管理页
- 菜谱表单：名称、分类、稀有度、图片、动态食材/关键词行
- 图片上传：文件选择 + 预览 + 上传
- 批量导入：粘贴 JSON 数组
- 菜谱列表：网格展示、编辑、删除

### 6.3 Composables

| 名称 | 功能 |
|------|------|
| `useStarCanvas` | Canvas 星空粒子背景动画（80 个粒子） |
| `useAudio` | Web Audio API 音效（揭示音 + 确认音） |
| `useHistory` | LocalStorage 历史记录管理 |

### 6.4 主题配色

| 颜色角色 | 值 | 用途 |
|----------|------|------|
| background | `#05070d` | 深空黑主背景 |
| surface | `rgba(10,14,24,0.82)` | 卡片/面板背景 |
| primary | `#f6c36a` | 金色（5 星） |
| secondary | `#d8a8ff` | 紫色（4 星） |
| info | `#7fc7ff` | 蓝色（3 星） |

---

## 7. 配置说明

### 环境变量（.env）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DB_USER` | test | 数据库用户名 |
| `DB_PASSWORD` | 123456 | 数据库密码 |
| `DB_HOST` | 127.0.0.1 | 数据库主机（Docker 内用 `db`） |
| `DB_PORT` | 5432 | 数据库端口 |
| `DB_NAME` | nap | 数据库名称 |
| `DB_ASYNC_URL` | (auto) | 可选：手动指定完整连接字符串 |
| `WISH_WEIGHT_5` | 2 | 5 星抽取权重 |
| `WISH_WEIGHT_4` | 10 | 4 星抽取权重 |
| `WISH_WEIGHT_3` | 88 | 3 星抽取权重 |
| `UPLOAD_MAX_BYTES` | 5242880 | 图片上传大小限制（字节） |

---

## 8. 构建与部署

### 本地开发

```bash
# 后端
cd Nap
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 前端（另一终端）
cd frontend
npm install
npm run dev          # Vite dev server，API 自动代理到 :8000
```

### Docker 部署

```bash
# 创建 .env 文件
cp .env.example .env
# 编辑 .env，设置 DB_HOST=db

# 首次启动
docker compose up --build

# 重置数据库
docker compose down -v
docker compose up --build
```

### 构建流程（Dockerfile）

1. **Stage 1** (node:20-slim)：`npm ci` → `npm run build` → 输出到 `/build/app/templates/`
2. **Stage 2** (python:3.11-slim)：安装 Python 依赖 → 复制后端代码 → 复制前端构建产物 → 启动 uvicorn

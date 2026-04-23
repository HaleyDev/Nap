# API 接口文档 — Metis Gastronomy Terminal

> 所有 API 端点的基础路径为 `/api/v1`

---

## 概览

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| `POST` | `/api/v1/uploads/recipe-image` | 上传菜谱图片 | 无 |
| `GET` | `/api/v1/wish` | 祈愿抽取 | 无 |
| `GET` | `/api/v1/recommend` | 每类推荐一道 | 无 |
| `POST` | `/api/v1/recipes` | 创建菜谱 | 无 |
| `POST` | `/api/v1/recipes/batch` | 批量导入菜谱 | 无 |
| `PUT` | `/api/v1/recipes/{recipe_id}` | 更新菜谱 | 无 |
| `GET` | `/api/v1/recipes` | 获取全部菜谱 | 无 |
| `DELETE` | `/api/v1/recipes/{recipe_id}` | 删除菜谱 | 无 |

---

## 公共数据结构

### Recipe（响应）

```json
{
  "id": 1,
  "name": "红烧肉",
  "category": "荤菜",
  "rarity": 5,
  "img_url": "/static/uploads/recipe-xxxx.jpg",
  "keywords": ["家常", "下饭"],
  "ingredients": ["五花肉 500g", "冰糖 30g", "酱油 3勺"],
  "last_cooked": "2026-04-23T10:00:00+00:00"
}
```

### RecipeCreate（请求）

```json
{
  "name": "红烧肉",
  "category": "荤菜",
  "rarity": 5,
  "img_url": "/static/uploads/recipe-xxxx.jpg",
  "keywords": ["家常", "下饭"],
  "ingredients": ["五花肉 500g", "冰糖 30g"]
}
```

### 字段约束

| 字段 | 类型 | 约束 |
|------|------|------|
| `name` | string | 1~100 字符，非空 |
| `category` | string | 必须为 `荤菜`/`素菜`/`汤`/`主食` 之一 |
| `rarity` | integer | 必须为 `3`、`4` 或 `5` |
| `img_url` | string | 非空，本地路径或 URL |
| `keywords` | string[] | 可选，自动去除空白项 |
| `ingredients` | string[] | 至少一项，自动去除空白项 |

---

## 端点详情

### 1. 上传菜谱图片

```
POST /api/v1/uploads/recipe-image
```

**Content-Type**: `multipart/form-data`

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | File | 是 | 图片文件 |

**支持格式**: JPG, PNG, WEBP, GIF

**大小限制**: 5MB（可通过 `UPLOAD_MAX_BYTES` 环境变量配置）

**成功响应** `201 Created`

```json
{
  "img_url": "/static/uploads/recipe-a1b2c3d4.jpg",
  "original_filename": "my-dish.jpg"
}
```

**错误响应**

| 状态码 | 说明 |
|--------|------|
| 400 | 文件格式不支持 / 文件为空 |
| 413 | 文件超出大小限制 |

---

### 2. 祈愿抽取

```
GET /api/v1/wish?count={int}&category={string}&keyword={string}
```

**Query 参数**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `count` | int | 是 | — | 抽取次数，范围 1~50 |
| `category` | string | 否 | null | 按分类过滤（荤菜/素菜/汤/主食） |
| `keyword` | string | 否 | null | 按关键字匹配食材和描述词 |

**成功响应** `200 OK`

```json
[
  {
    "id": 1,
    "name": "红烧肉",
    "category": "荤菜",
    "rarity": 5,
    "img_url": "/static/uploads/recipe-xxxx.jpg",
    "keywords": ["家常"],
    "ingredients": ["五花肉 500g"],
    "last_cooked": "2026-04-23T10:00:00+00:00"
  }
]
```

**业务规则**
- 概率分布：5 星 2%、4 星 10%、3 星 88%
- 10 连抽保底：若 count ≥ 10 且全部为 3 星，最后一张替换为 4/5 星
- 抽中的菜谱 `last_cooked` 自动更新为当前时间

**错误响应**

| 状态码 | 说明 |
|--------|------|
| 404 | 没有可抽取的菜谱（整体或该分类为空） |
| 422 | category 值不合法 |

---

### 3. 每类推荐一道

```
GET /api/v1/recommend
```

**无参数**

**成功响应** `200 OK`

返回数组，每个已有菜谱的分类随机推荐一道。

```json
[
  { "id": 1, "name": "红烧肉", "category": "荤菜", "rarity": 5, ... },
  { "id": 5, "name": "番茄蛋汤", "category": "汤", "rarity": 3, ... }
]
```

---

### 4. 创建菜谱

```
POST /api/v1/recipes
```

**Content-Type**: `application/json`

**请求体**: RecipeCreate 对象

**成功响应** `201 Created`

返回创建的 Recipe 对象（含自动生成的 `id` 和 `created_at`）。

**错误响应**

| 状态码 | 说明 |
|--------|------|
| 422 | 字段验证失败 |

---

### 5. 批量导入菜谱

```
POST /api/v1/recipes/batch
```

**Content-Type**: `application/json`

**请求体**

```json
{
  "recipes": [
    { "name": "红烧肉", "category": "荤菜", "rarity": 5, "img_url": "...", "keywords": [], "ingredients": ["五花肉"] },
    { "name": "番茄蛋汤", "category": "汤", "rarity": 3, "img_url": "...", "keywords": [], "ingredients": ["番茄", "鸡蛋"] }
  ]
}
```

**成功响应** `201 Created`

返回创建的 Recipe 数组。所有菜谱在同一事务中创建（原子性）。

**错误响应**

| 状态码 | 说明 |
|--------|------|
| 422 | 任一菜谱字段验证失败则全部回滚 |

---

### 6. 更新菜谱

```
PUT /api/v1/recipes/{recipe_id}
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `recipe_id` | int | 菜谱 ID |

**Content-Type**: `application/json`

**请求体**: RecipeCreate 对象（全量更新）

**成功响应** `200 OK`

返回更新后的 Recipe 对象。

**副作用**：如果 `img_url` 发生变化，旧的本地图片文件会被自动删除。

**错误响应**

| 状态码 | 说明 |
|--------|------|
| 404 | 菜谱不存在 |
| 422 | 字段验证失败 |

---

### 7. 获取全部菜谱

```
GET /api/v1/recipes
```

**无参数**

**成功响应** `200 OK`

返回所有菜谱数组，按稀有度降序、名称升序排列。

```json
[
  { "id": 1, "name": "红烧肉", "category": "荤菜", "rarity": 5, ... },
  { "id": 2, "name": "宫保鸡丁", "category": "荤菜", "rarity": 4, ... },
  { "id": 3, "name": "番茄蛋汤", "category": "汤", "rarity": 3, ... }
]
```

---

### 8. 删除菜谱

```
DELETE /api/v1/recipes/{recipe_id}
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| `recipe_id` | int | 菜谱 ID |

**成功响应** `204 No Content`

无响应体。

**副作用**：如果菜谱图片是本地上传的（路径以 `/static/uploads/` 开头），会自动删除图片文件。

**错误响应**

| 状态码 | 说明 |
|--------|------|
| 404 | 菜谱不存在 |

---

## 页面路由（非 API）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/` | 返回 Vue SPA（抽奖页） |
| `GET` | `/admin` | 返回 Vue SPA（管理页） |
| `GET` | `/static/uploads/{filename}` | 静态图片访问 |
| `GET` | `/assets/{filename}` | Vue 构建产物（JS/CSS） |

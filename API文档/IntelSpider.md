# IntelSpider 智能情报采集服务 API 文档

说明：所有接口前缀为 `/api`，返回均为 JSON；时间字段统一为北京时间字符串（`YYYY-MM-DD HH:MM:SS`）。需要认证的接口需在请求头加入 `Authorization: Bearer <accessToken>`。

## 接口总览
- 查询服务状态：`GET /api/intelspider/status`
- 创建情报源：`POST /api/intelspider/sources`
- 查询情报源列表：`GET /api/intelspider/sources`
- 删除情报源（级联删除点与任务/文章）：`DELETE /api/intelspider/sources/{source_id}`
- 创建情报点：`POST /api/intelspider/points`
- 查询情报点列表：`GET /api/intelspider/points`
- 删除情报点（级联删除任务与文章）：`DELETE /api/intelspider/points/{point_id}`
- 触发情报点采集（后台执行）：`POST /api/intelspider/points/{point_id}/run`
- 查询情报点的原子任务（分页、懒加载、筛选与统计）：`GET /api/intelspider/points/{point_id}/tasks`
- 查询文章列表：`GET /api/intelspider/articles`

---

## 查询服务状态
- 接口介绍：返回 IntelSpider 的关键配置与可用密钥数量，便于快速诊断。
- 接口方法：`GET /api/intelspider/status`
- 返回示例：
```
{ "jina_concurrency": 10, "llm_model": "glm-4-flash-250414", "llm_concurrency": 15, "global_max_concurrent": 10, "zhipu_keys_count": 1 }
```

- 说明：本服务支持本地向量模型配置，`services/intelspider/.env` 可设置：
  - `EMBEDDING_PROVIDER=local`
  - `EMBEDDING_MODEL_NAME=BAAI/bge-large-zh-v1.5`
  - `HTTP_PROXY`、`SOCKS5_PROXY`（可选）

---

## 创建情报源
- 接口介绍：创建新的情报源（用于归属情报点和文章）。
- 接口方法：`POST /api/intelspider/sources`
- 字段说明：
  - `name`：字符串，必填，源名称（唯一）。
  - `base_url`：字符串，可选，源的主站 URL。
- curl 示例：
```
curl -sS -X POST http://127.0.0.1:7657/api/intelspider/sources \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <accessToken>' \
  -d '{ "name": "汽车之家", "base_url": "https://www.autohome.com.cn/" }'
```
- 返回示例：
```
{ "id": "<source_id>", "name": "汽车之家", "base_url": "https://www.autohome.com.cn/", "created_at": "2025-12-08 10:05:33", "updated_at": "2025-12-08 10:05:33" }
```

---

## 查询情报源列表
- 接口介绍：按创建时间倒序返回所有情报源。
- 接口方法：`GET /api/intelspider/sources`
- 返回示例（数组）：
```
[ { "id": "<source_id>", "name": "汽车之家", "base_url": "https://www.autohome.com.cn/", "created_at": "...", "updated_at": "..." } ]
```

---

## 创建情报点
- 接口介绍：为指定源创建采集列表页入口，并配置翻页与深度。
- 接口方法：`POST /api/intelspider/points`
- 字段说明：
  - `source_id`：字符串，与 `source_name` 二选一；优先使用 ID。
  - `source_name`：字符串，如果源不存在会自动创建。
  - `point_name`：字符串，必填，情报点名称。
  - `point_url`：字符串，必填，列表页 URL（绝对路径）。
  - `cron_schedule`：字符串，采集频率（Cron 表达式）。
  - `max_depth`：整数，最大翻页深度（默认 5）。
  - `pagination_instruction`：字符串，隐式翻页规则，例如 `page/{n}`、`index_{n}.shtml`。
- curl 示例：
```
curl -sS -X POST http://127.0.0.1:7657/api/intelspider/points \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <accessToken>' \
  -d '{ "source_id": "<source_id>", "point_name": "新闻列表", "point_url": "https://www.autohome.com.cn/news/", "cron_schedule": "*/10 * * * *", "max_depth": 2, "pagination_instruction": "page/{n}" }'
```
- 返回示例：
```
{ "id": "<point_id>", "source_id": "<source_id>", "source_name": "汽车之家", "point_name": "新闻列表", "point_url": "https://www.autohome.com.cn/news/", "cron_schedule": "*/10 * * * *", "max_depth": 2, "pagination_instruction": "page/{n}", "status": "Idle", "is_active": true, "created_at": "...", "updated_at": "..." }
```

---

## 查询情报点列表
- 接口介绍：返回所有情报点，可按 `source_id` 过滤。
- 接口方法：`GET /api/intelspider/points`
- 查询参数：
  - `source_id`：字符串，可选，按源过滤。
- 返回示例（数组）：与“创建情报点”返回字段一致。

---

## 触发情报点采集（后台执行）
- 接口介绍：向后台提交执行任务，立即开始抓取列表页与详情页，并写入文章。
- 接口方法：`POST /api/intelspider/points/{point_id}/run`
- 字段说明：无请求体。
- 返回示例：
```
{ "status": "queued", "point_id": "<point_id>" }
```

---

## 查询情报点的原子任务
- 接口介绍：返回指定情报点的任务列表，支持分页、懒加载、按状态与任务类型筛选，并返回总数与各状态统计。
- 接口方法：`GET /api/intelspider/points/{point_id}/tasks`
- 查询参数：
  - `page`：整数，默认 `1`
  - `limit`：整数，默认 `20`，最大 `200`
  - `status`：字符串，可选，取值 `pending|running|done|error`
  - `task_type`：字符串，可选，取值 `JINA_FETCH|LLM_ANALYZE_LIST|LLM_ANALYZE_ARTICLE|PERSIST`
- 返回示例（对象）：
```
{
  "point": { "id": "<point_id>", "source_id": "<source_id>", "source_name": "汽车之家", "point_name": "新闻列表" },
  "total": 132,
  "page": 1,
  "limit": 20,
  "counts": { "pending": 10, "running": 2, "done": 118, "error": 2 },
  "type_counts": { "JINA_FETCH": 50, "LLM_ANALYZE_LIST": 2, "LLM_ANALYZE_ARTICLE": 40, "PERSIST": 40 },
  "page_counts": {
    "status": { "pending": 4, "running": 1, "done": 15 },
    "types": { "JINA_FETCH": 8, "LLM_ANALYZE_LIST": 1, "LLM_ANALYZE_ARTICLE": 6 }
  },
  "items": [
    { "id": "<task_id>", "task_type": "LLM_ANALYZE_LIST", "status": "running", "url": "https://...", "page_number": 1, "error_message": null, "created_at": "2025-12-08 10:08:00", "finished_at": null }
  ]
}
```

---

## 任务类型中文说明

- `JINA_FETCH`：Jina 页面读取，将网页转为 Markdown
- `LLM_ANALYZE_LIST`：LLM 解析列表页，提取文章链接与下一页
- `LLM_ANALYZE_ARTICLE`：LLM 清洗文章正文并提取标题与发布时间
- `PERSIST`：将识别出的文章与任务结果持久化入库

---

## 查询文章列表（支持筛选与分页）
- 接口方法：`GET /api/intelspider/articles`
- 查询参数：
  - `source_id`：字符串，可选，按情报源过滤
  - `point_id`：字符串，可选，按情报点过滤
  - `start_time`：字符串，可选，发布时间起（`YYYY-MM-DD` 或 `YYYY-MM-DD HH:mm`）
  - `end_time`：字符串，可选，发布时间止
  - `is_reviewed`：布尔，可选，筛选审核状态
  - `page`：整数，默认 `1`
  - `limit`：整数，默认 `20`，最大 `200`
- 返回示例（对象）：
```
{ "total": 240, "page": 1, "limit": 20, "items": [ { "id": "<article_id>", "point_id": "<point_id>", "title": "示例标题", "publish_time": "2025-12-08 09:30", "content": "# 标题\n正文...", "original_url": "https://...", "collected_at": "2025-12-08 10:10:00", "is_reviewed": false } ] }
```
- 说明：支持懒加载与前端分页，前端每次按需拉取下一页。

---

## 设计与约束说明
- 列表与翻页：Jina Reader 转 Markdown，LLM 只返回 JSON，隐式翻页通过 `pagination_instruction` 构造（如 `page/{n}`）。
- 正文清洗：LLM 清理广告、导航与无关链接，保留 Markdown。
- 并发与重试：Jina 与 LLM 独立限流（`JINA_CONCURRENCY` / `LLM_CONCURRENCY`），指数退避；Jina 429 自动退避重试。
- 认证：除 `/status` 外所有接口需 Bearer Token。
- 代理：可在 `services/intelspider/.env` 设置 `HTTP_PROXY` 与 `SOCKS5_PROXY`。

---

## 任务类型说明（中文）

- `JINA_FETCH`：使用 Jina Reader 抓取网页并转换为 Markdown
- `LLM_ANALYZE_LIST`：用 LLM 分析列表页，提取文章链接与下一页
- `LLM_ANALYZE_ARTICLE`：用 LLM清洗与整理文章正文结构化信息
- `PERSIST`：持久化写入文章或任务数据到数据库

---

## 审核与向量化

- 审核接口：`POST /api/intelspider/articles/{article_id}/review`
  - 请求体：`{ "is_reviewed": true }`
  - 行为：当 `is_reviewed=true` 时后台触发向量化，使用本地模型 `BAAI/bge-large-zh-v1.5`，分段策略约 500 字、100 字重叠，最多保留 200 段。
  - 存储：将分段与向量写入新表 `intelspider_article_embeddings`。

- 查询接口：`POST /api/intelspider/articles/vector-search`
  - 请求体：
    ```json
    { "vectors": [[0.1,0.2,...]], "source_id": "<source_id>", "point_id": "<point_id>", "month_start": "2025-11-01", "month_end": "2025-11-30", "page": 1, "limit": 20 }
    ```
  - 返回：按余弦相似度排序的分页结果，包含 `score` 与原始文章元数据（标题、内容、发布时间、URL）。
  - 说明：支持单向量或多向量同时匹配，取最大分数作为该文章的匹配分。

---

## 新增字段：文章URL过滤

- `article_url_filters`：数组，可选。用于过滤 LLM 识别出的文章详情页 URL，仅保留以这些前缀开头的链接，避免页眉/页脚等误识别产生的垃圾数据。
- 位置：`POST /api/intelspider/points` 的请求体与响应体，`GET /api/intelspider/points` 列表返回。
- 示例：
  - 请求体：
    ```json
    {
      "source_id": "<source_id>",
      "point_name": "产业新闻",
      "point_url": "https://auto.gasgoo.com/industry/",
      "max_depth": 3,
      "pagination_instruction": "index_{n}.shtml",
      "article_url_filters": [
        "https://auto.gasgoo.com/news/",
        "https://auto.gasgoo.com/trends/"
      ]
    }
    ```
  - 行为：采集引擎将在列表页 LLM 返回的 `articles` 中，仅保留 `url` 以上述前缀开头的项，并将这些文章入队为待抓取任务。

---

## 示例流程
1. 登录获取 Token：`POST /api/user/login`
2. 创建源：`POST /api/intelspider/sources`
3. 创建点：`POST /api/intelspider/points`
4. 后台触发点采集：`POST /api/intelspider/points/{point_id}/run`
5. 查看任务与文章：`GET /api/intelspider/points/{point_id}/tasks`、`GET /api/intelspider/articles?point_id=<point_id>`


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
- 更新情报点配置：`PUT /api/intelspider/points/{point_id}`
- 触发情报点采集（后台执行）：`POST /api/intelspider/points/{point_id}/run`
- 查询情报点的原子任务（分页、懒加载、筛选与统计）：`GET /api/intelspider/points/{point_id}/tasks`
- 查询文章列表：`GET /api/intelspider/articles`
- 查询文章详情：`GET /api/intelspider/articles/{article_id}`
- 更新文章内容：`PUT /api/intelspider/articles/{article_id}`

---

## 查询服务状态
- 接口介绍：返回 IntelSpider 的关键配置与可用密钥数量，便于快速诊断。
- 接口方法：`GET /api/intelspider/status`
- 返回示例：
```
{ "jina_concurrency": 10, "llm_model": "glm-4-flash-250414", "llm_concurrency": 15, "global_max_concurrent": 10, "zhipu_keys_count": 1 }
```

- 说明：本服务支持本地向量模型与分段配置，`services/intelspider/.env` 可设置：
  - `EMBEDDING_PROVIDER=local`
  - `EMBEDDING_MODEL_NAME=BAAI/bge-large-zh-v1.5`
  - `EMBEDDING_CHUNK_MAX_TOKENS=1024`
  - `EMBEDDING_CHUNK_OVERLAP_TOKENS=64`
  - `EMBEDDING_MAX_CHUNKS=64`
  - `HTTP_PROXY`、`SOCKS5_PROXY`（可选）
  - 反爬兜底（Crawl4AI）：`CRAWL4AI_ENABLED`、`CRAWL4AI_PROXIES`、`CRAWL4AI_HEADLESS`、`CRAWL4AI_TIMEOUT`、`JINA_MAX_RETRIES`
  - Jina 代理与并发：`JINA_USE_PROXIES`、`JINA_PROXIES`、`JINA_PER_PROXY_CONCURRENCY`、`PROXY_COOLDOWN_SECONDS`
  - 统一代理文件：`PROXY_LIST_PATH`（每行 `IP:PORT`，支持 `http/https/socks5`），统一供 Jina 与 Crawl4AI 使用；日志限频：`LOG_INTERVAL_SECONDS`

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
  - `max_depth`：整数，首次采集分页/滚动最大深度（默认 5，仅用于首次）。
  - `pager_module_name`：字符串，可选，从源级共享的翻页插件名；若提供，系统会为该点生成入口文件 `services/intelspider/pagers/{point_id}.py` 指向该共享插件。
- curl 示例：
```
curl -sS -X POST http://127.0.0.1:7657/api/intelspider/points \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <accessToken>' \
  -d '{ "source_id": "<source_id>", "point_name": "新闻列表", "point_url": "https://www.autohome.com.cn/news/", "cron_schedule": "*/10 * * * *", "max_depth": 2, "pager_module_name": "shared_gasgoo" }'
```
- 返回示例：
```
{ "id": "<point_id>", "source_id": "<source_id>", "source_name": "汽车之家", "point_name": "新闻列表", "point_url": "https://www.autohome.com.cn/news/", "cron_schedule": "*/10 * * * *", "max_depth": 2, "status": "Idle", "is_active": true, "created_at": "...", "updated_at": "...", "pager_configured": false }
```

---

## 查询情报点列表
- 接口介绍：返回所有情报点，可按 `source_id` 过滤。
- 接口方法：`GET /api/intelspider/points`
- 查询参数：
  - `source_id`：字符串，可选，按源过滤。
- 返回示例（数组）：与“创建情报点”返回字段一致，并包含 `pager_configured`。

---

## 更新情报点配置（支持插件选择）
- 接口介绍：对已有情报点进行局部更新，所有字段均为可选。
- 接口方法：`PUT /api/intelspider/points/{point_id}`
- 请求体示例：
```
{ "point_name": "新闻列表（改）", "point_url": "https://www.autohome.com.cn/news/", "cron_schedule": "*/15 * * * *", "max_depth": 3, "pager_module_name": "shared_gasgoo", "article_url_filters": ["https://www.autohome.com.cn/news/"], "is_active": true }
```
- 返回：与 `GET /api/intelspider/points` 的单项字段一致（`PointPublic`）。
- 说明：仅更新请求体中提供的字段，未提供的保持不变；`is_active` 为布尔值。

---

## 触发情报点采集（后台执行；首次使用插件分页）
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
    { "id": "<task_id>", "task_type": "LLM_ANALYZE_LIST", "status": "running", "url": "https://...", "page_number": 1, "error_message": null, "fetcher": "JINA", "created_at": "2025-12-08 10:08:00", "finished_at": null }
  ]
}
```

---

## 查询原子任务（支持筛选与分页）
- 接口方法：`GET /api/intelspider/tasks`
- 查询参数：
  - `page`：整数，默认 `1`
  - `limit`：整数，默认 `20`，最大 `200`
  - `status`：字符串，可选，过滤任务状态（`pending|running|done|error`）
  - `task_type`：字符串，可选，过滤任务类型（`JINA_FETCH|LLM_ANALYZE_LIST|LLM_ANALYZE_ARTICLE|PERSIST`）
  - `point_id`：字符串，可选，按情报点过滤
  - `source_id`：字符串，可选，按情报源过滤
  - `fetcher`：字符串，可选，过滤抓取器（`JINA|CRAWL4AI|HTML2TEXT|NONE`）
- 返回示例：
```
{ "total": 132, "page": 1, "limit": 20, "items": [
  { "id": "<task_id>", "source_id": "<source_id>", "source_name": "汽车之家", "point_id": "<point_id>", "point_name": "新闻列表", "task_type": "LLM_ANALYZE_LIST", "stage": "列表页解析", "status": "running", "url": "https://...", "page_number": 1, "fetcher": "JINA", "error_message": null, "created_at": "2025-12-08 10:08:00", "finished_at": null }
]}
```
- 字段解释：
  - `stage`：中文阶段说明，映射自 `task_type`
  - `fetcher`：实际使用的抓取器（Jina、Crawl4AI、本地HTML转Markdown或未使用）。首次采集若配置了翻页插件，将使用 Crawl4AI 浏览器驱动完成多页抓取。
  - 其余字段与数据库含义一致：状态、URL、页码、错误信息、创建/完成时间等

---

## 原子任务维度统计
- 接口方法：`GET /api/intelspider/tasks/stats`
- 返回示例：
```
{
  "total": 633,
  "status_counts": { "pending": 12, "running": 0, "done": 621, "error": 0 },
  "type_counts": { "JINA_FETCH": 300, "LLM_ANALYZE_LIST": 12, "LLM_ANALYZE_ARTICLE": 200, "PERSIST": 121 },
  "fetcher_counts": { "JINA": 280, "CRAWL4AI": 15, "HTML2TEXT": 5, "None": 333 },
  "points": [
    { "source_id": "<source_id>", "source_name": "汽车之家", "point_id": "<point_id>", "point_name": "新闻列表", "total": 132, "pending": 10, "running": 2, "done": 118, "error": 2 }
  ]
}
```
- 统计维度说明：
  - `status_counts`：各状态任务数量分布
  - `type_counts`：各任务类型数量分布
  - `fetcher_counts`：抓取器使用分布（含 `None` 表示非抓取型任务）
  - `points`：按情报点聚合的统计（含源与点名称），便于定位某点的任务健康度

## 任务类型中文说明

- `JINA_FETCH`：Jina 页面读取，将网页转为 Markdown
- `LLM_ANALYZE_LIST`：LLM 解析列表页，提取文章链接（下一页由独立调用构造）
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
{ "total": 240, "page": 1, "limit": 20, "items": [ { "id": "<article_id>", "point_id": "<point_id>", "title": "示例标题", "publish_time": "2025-12-08 09:30", "original_url": "https://...", "collected_at": "2025-12-08 10:10:00", "is_reviewed": false } ] }
```
- 说明：支持懒加载与前端分页，前端每次按需拉取下一页。

---

## 设计与约束说明（更新）
- 列表与翻页：首次采集使用 Crawl4AI 插件执行分页/滚动（最多 `max_depth` 页），后续采集回到单页抓取与列表解析；翻页提示词已弃用。
- 正文清洗：LLM 清理广告、导航与无关链接，保留 Markdown。
- 并发与重试：Jina 与 LLM 独立限流（`JINA_CONCURRENCY`；LLM 支持分离配置：`LLM_LIST_CONCURRENCY` / `LLM_ARTICLE_CONCURRENCY`，未设置时回退到 `LLM_CONCURRENCY`），指数退避；Jina 429 自动退避重试。
- 认证：除 `/status` 外所有接口需 Bearer Token。
- 代理：可在 `services/intelspider/.env` 设置 `HTTP_PROXY` 与 `SOCKS5_PROXY`。
- 去重策略：两阶段去重。列表阶段在写入 `intelspider_atomic_tasks` 前，使用 URL 同时对 `intelspider_articles` 与 `intelspider_atomic_tasks`（状态 `pending|running|done`）进行比对；详情阶段在抓取文章时再次通过 `original_url` 对 `intelspider_articles` 检查并跳过。
- 反爬兜底：当 Jina 多次重试失败时启用 Crawl4AI（可选），支持代理轮询与无头浏览器，最终在 `intelspider_atomic_tasks.fetcher` 字段记录实际使用的抓取器（`JINA|CRAWL4AI|HTML2TEXT|NONE`）。
- Jina 并发分桶：当 `JINA_USE_PROXIES=true` 且配置了多代理时，总并发 = 代理数 × `JINA_PER_PROXY_CONCURRENCY`；每个代理的 Jina 并发受 `JINA_PER_PROXY_CONCURRENCY` 限制；代理发生错误时进入 `PROXY_COOLDOWN_SECONDS` 冷却，不参与轮询。

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
  - 行为：当 `is_reviewed=true` 时后台触发向量化，使用本地模型 `BAAI/bge-large-zh-v1.5`；分段策略：
    - 优先按 Markdown 标题切块，保留结构
    - 每块按 token 窗口切分，默认 `EMBEDDING_CHUNK_MAX_TOKENS=1024`，重叠 `EMBEDDING_CHUNK_OVERLAP_TOKENS=64`
    - 单文最多 `EMBEDDING_MAX_CHUNKS=64`，可在 `services/intelspider/.env` 调整
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
- 模型分离：
  - `LLM_LIST_MODEL`：列表页解析模型（例如 `glm-4.5-flash`）。
  - `LLM_ARTICLE_MODEL`：文章详情解析模型（例如 `glm-4-flash-250414`）。
  - 若不设置，均回退到 `LLM_MODEL`。
## 查询文章详情
- 接口方法：`GET /api/intelspider/articles/{article_id}`
- 返回示例：
```
{ "id": "<article_id>", "source_id": "<source_id>", "source_name": "汽车之家", "point_id": "<point_id>", "point_name": "新闻列表", "title": "示例标题", "publish_time": "2025-12-08 09:30", "content": "# 标题\n正文...", "original_url": "https://...", "collected_at": "2025-12-08 10:10:00", "is_reviewed": false }
```

## 更新文章内容
- 接口方法：`PUT /api/intelspider/articles/{article_id}`
- 请求体：
```
{ "title": "新的标题", "publish_time": "2025-12-08 09:30", "content": "# 标题\n正文..." }
```
- 返回示例：
```
{ "ok": true, "article_id": "<article_id>" }
```

# IntelSpider 服务 API 文档

前缀：`/api/intelspider`
鉴权：所有涉及写入或敏感数据的接口需在请求头携带 `Authorization: Bearer <token>`（登录接口见用户服务）。

## 术语说明
- `情报源 (Source)`: 某网站或平台的顶层来源，如“盖世汽车”。
- `情报点 (Point)`: 某来源下的具体采集板块或页面，如“行业资讯”。
- `待审核文章 (Pending Article)`: 爬取后进入审核池，用户审核通过后才会向量化入库。
- `文章 (Article)`: 审核通过且完成入库与向量化的内容。
- `任务 (Task)`: 采集执行过程中的流水记录，便于前端监控进度与排错。

## 列表速览
- 源与点管理：
  - `GET /intelspider/sources` 列出所有情报源
  - `GET /intelspider/points` 按源列出情报点
  - `POST /intelspider/points` 创建情报点
  - `POST /intelspider/points/{point_id}/run-now` 立即运行该点的采集（生成待审核与任务）；支持 AI 翻页指引与翻页深度，列表分析与正文清洗由 LLM 执行
- 待审核与审核：
  - `POST /intelspider/pending` 创建待审核文章
- `GET /intelspider/pending` 列出待审核文章
  - `POST /intelspider/review/approve` 批量审核通过并入库向量化
- 已入库文章：
  - `GET /intelspider/articles` 分页列出文章
- 任务监控：
  - `GET /intelspider/tasks` 最近任务流水列表

---

## 1. 创建情报点
- 路径：`POST /intelspider/points`
- 说明：在指定情报源下创建一个采集点。
- 请求体：
```json
{
  "source_name": "盖世汽车",
  "point_name": "行业资讯",
  "point_url": "https://auto.gasgoo.com/industry/C-108",
  "cron_schedule": "0 */2 * * *",
  "max_depth": 3,
  "pagination_instruction": "页面URL形如 ...?page=n ，请按当前页+1构造下一页"
}
```
- 字段解释：
  - `source_name` 字符串，情报源名称；若不存在会自动创建源。
  - `point_name` 字符串，情报点名称。
  - `point_url` 字符串，采集入口 URL（必须是可访问的绝对地址）。
  - `cron_schedule` 字符串，CRON 表达式，仅用于展示和后续调度扩展。
- 响应：
```json
{"ok": true, "point_id": "<uuid>"}
```

## 2. 列出情报源
- 路径：`GET /intelspider/sources`
- 响应：
```json
[
  {"id": "<uuid>", "source_name": "盖世汽车"}
]
```

## 3. 列出情报点
- 路径：`GET /intelspider/points?source_name=盖世汽车`
- 查询参数：
  - `source_name` 可选，按源过滤；不传则返回全部。
- 响应：
```json
[
  {
    "id": "<uuid>",
    "source_name": "盖世汽车",
    "point_name": "行业资讯",
    "point_url": "https://auto.gasgoo.com/industry/C-108",
    "cron_schedule": "0 */2 * * *",
    "max_depth": 3,
    "pagination_instruction": "页面URL形如 ...?page=n ，请按当前页+1构造下一页",
    "is_active": 1
  }
]
```

## 4. 立即运行采集
- 路径：`POST /intelspider/points/{point_id}/run-now`
- 说明：执行该点的列表抓取与文章采集，生成“待审核文章”和“任务流水”。
- 请求体：整数（页数）；与情报点的 `max_depth` 共同决定翻页上限。启用 LLM 列表分析与正文清洗。
- 响应：
```json
{"ok": true, "processed": 12}
```
- 注意：
  - 采集结果不会直接入库向量化，需经审核通过后才入库。
  - 任务流水可用 `GET /intelspider/tasks` 查看；阶段包括 `JINA_FETCH`、`LLM_ANALYZE_LIST`、`JINA_FETCH_ARTICLE`、`LLM_ANALYZE_ARTICLE`、`PERSIST_PENDING`。
  - 每次运行会创建运行记录 `run`，可用 `run_id` 在任务列表中过滤查看某次运行的流水。

## 5. 创建待审核文章
- 路径：`POST /intelspider/pending`
- 请求体：
```json
{
  "source_name": "盖世汽车",
  "point_name": "行业资讯",
  "point_url": "https://auto.gasgoo.com/industry/C-108",
  "original_url": "https://example.com/a/123",
  "title": "标题",
  "publish_date": "2025-12-01T12:00:00",
  "content": "Markdown 正文",
  "crawl_metadata": {"page": 1}
}
```
- 字段解释：
  - `original_url` 文章原始地址，用于去重。
  - `content` 文章 Markdown 内容；不要摘要或精简，尽量完整。
  - 其它字段按字面含义使用。
- 响应：
```json
{"ok": true, "pending_id": "<uuid>"}
```

## 6. 列出待审核文章（支持懒加载分页，并返回正文）
- 路径：`GET /intelspider/pending`
- 查询参数：
  - `page` 页码，从 1 开始，默认 1
  - `limit` 每页条数，默认 20，最大 100
- 响应：
```json
[
  {
    "id": "<uuid>",
    "title": "标题",
    "original_url": "https://example.com/a/123",
    "source_name": "盖世汽车",
    "point_name": "行业资讯",
    "status": "pending",
    "content": "Markdown 正文"
  }
]
```

## 7. 批量审核通过并入库向量化
- 路径：`POST /intelspider/review/approve`
- 说明：将所选“待审核文章”入库并向量化为分段嵌入。
- 请求体：
```json
{
  "article_ids": ["<pending_id_1>", "<pending_id_2>"]
}
```
- 行为：
  - 将对应内容写入 `intelspider_collected_articles`，并分段写入 `intelspider_article_vectors`。
  - 删除对应的 `intelspider_pending_articles` 记录。
- 响应：
```json
{"ok": true, "processed": 2}
```

## 8. 分页列出已入库文章
- 路径：`GET /intelspider/articles`
- 查询参数：
  - `source_name` 可选，按源过滤。
  - `point_id` 可选，按点过滤。
  - `page` 页码，从 1 开始。
  - `limit` 每页条数，默认 20。
- 响应：
```json
[
  {
    "id": "<uuid>",
    "title": "标题",
    "publish_date": "2025-12-01T12:00:00",
    "source_name": "盖世汽车",
    "point_name": "行业资讯",
    "original_url": "https://example.com/a/123"
  }
]
```

## 9. 任务列表（监控，支持懒加载分页与按运行过滤）
- 路径：`GET /intelspider/tasks`
- 说明：返回最近的采集任务流水，用于前端监控。
- 查询参数：
  - `page` 页码，从 1 开始，默认 1
  - `limit` 每页条数，默认 20，最大 100
  - `run_id` 可选，仅返回指定运行实例的任务流水
- 响应：
```json
[
  {
    "id": "<uuid>",
    "run_id": "<run_uuid>",
    "source_name": "盖世汽车",
    "point_name": "行业资讯",
    "url": "https://...",
    "stage": "列表获取|文章采集",
    "status": "running|completed|failed",
    "detail": "md_len=1234 或 created_pending=<uuid>",
    "start_time": "2025-12-07T12:00:00",
    "end_time": "2025-12-07T12:00:12"
  }
]
```

## 配置与网络（.env）
- `EMBEDDING_PROVIDER`：`local`（默认）
- `EMBEDDING_MODEL_NAME`：默认 `BAAI/bge-large-zh-v1.5`
- `JINA_MAX_CONCURRENCY`：并发上限（建议 5-8，过高易限流）
- `ENABLE_PROXY`：是否启用代理（`true|false`）
- `HTTP_PROXIES`：逗号分隔多个 HTTP 代理（需带协议，如 `http://127.0.0.1:20171`）
- `SOCKS5_PROXIES`：逗号分隔多个 SOCKS5 代理（需带协议，如 `socks5://127.0.0.1:20172`）
- `MAX_LIST_ANALYZE_WORKERS` / `MAX_ARTICLE_FETCH_WORKERS`：工作线程占位
- `HTML_GENERATION_ENABLED`：是否生成 HTML 报告（默认关闭）
 - `ZHIPUAI_API_KEY` / `ZHIPUAI_API_KEYS`：智谱 GLM API 密钥；支持单密钥或逗号分隔多密钥
 - `ZHIPU_LLM_MODEL`：GLM 模型名，如 `glm-4-flash`（低延迟）或 `glm-4`
 - `ZHIPU_CONCURRENCY_PER_KEY`：每个密钥并发占位，避免 429；后端可据此限制同时发起的 LLM 请求数

## 异常与返回约定
- 所有接口在出现业务错误时返回标准 HTTP 状态码（如 401 未授权、404 未找到、500 服务器错误）及明确的 `detail` 文本。
- 去重规则：`original_url` 唯一，重复上传会直接跳过。
- 审核流程：只有审核通过才进行向量化，确保内容质量。
 - LLM 失败回退：在列表分析失败时回退为正则链接抽取；正文清洗失败时回退为 Jina Markdown 原文。

---

如需扩展“列表 LLM 辅助分析”和“翻页构造”，可在不改变现有接口的前提下新增可选参数与后端模块，前端无需额外适配即可获得增强能力。

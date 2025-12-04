# 情报采集服务 API 文档

本服务提供通用的网页情报采集能力：
- 列表页通过 JINA 无密钥模式获取 Markdown；
- 详情页使用 LLM 解析标题、时间与正文；
- 文章向量由本地或智谱AI嵌入模型生成并入库；
- 提供“待确认”队列以便人工审核质量。

根路径：`/api/intelligence_collection`

## 1. 配置说明

- `.env` 文件路径：`services/intelligence_collection/.env`
- 支持的关键项：
  - `EMBEDDING_PROVIDER`：`local` 或 `zhipuai`，建议使用 `local`
  - `EMBEDDING_MODEL_NAME`：本地模型名，如 `BAAI/bge-large-zh-v1.5`
  - `IC_ZHIPUAI_API_KEY` / `IC_ZHIPUAI_API_KEYS`：智谱AI密钥（如使用 zhipuai 嵌入或 LLM）
  - `IC_ZHIPUAI_LLM_MODEL`：LLM模型，例如 `glm-4-flash`
  - `IC_JINA_API_KEYS`：可选，JINA支持无密钥；如设置则加入 `Authorization: Bearer` 请求头
  - `IC_REQUEST_DELAY`：抓取限速（秒）
  - `IC_SCHEDULER_INTERVAL_SECONDS` / `IC_EXECUTOR_INTERVAL_SECONDS`：调度与执行线程轮询间隔

## 2. 认证

- 所有接口需要 Bearer Token（从 `/api/user/login` 获取）。

## 3. 源管理

### POST `/sources`
- 介绍：创建情报源
- 请求体：
```json
{"name":"盖世汽车","main_url":"https://auto.gasgoo.com/"}
```
- 返回：`SourcePublic`
```json
{"id":"src-1","name":"盖世汽车","main_url":"https://auto.gasgoo.com/","points_count":0,"articles_count":0,"created_at":"2025-12-04T11:00:00+08:00"}
```

### GET `/sources`
- 介绍：列出所有情报源
- 返回：`SourcePublic[]`

## 4. 情报点管理

### POST `/points`
- 介绍：创建情报点（列表入口）
- 请求体字段：
  - `source_name`：源名
  - `name`：点名
  - `url`：列表页URL
  - `cron_schedule`：CRON表达式
  - 可选：`mode`、`url_filters[]`、`extra_hint`、`enable_pagination`、`initial_pages`
示例：
```json
{
  "source_name":"盖世汽车",
  "name":"行业新闻",
  "url":"https://auto.gasgoo.com/",
  "cron_schedule":"*/30 * * * *",
  "url_filters":["https://auto.gasgoo.com/news/"]
}
```
- 返回：`PointPublic`

### GET `/points`
- 介绍：按源筛选并列出情报点
- 查询参数：`source_name?`
- 返回：`PointPublic[]`

### POST `/points/{point_id}/toggle`
- 介绍：启用/停用情报点
- 请求体：`{"enable":true}`
- 返回：`{"ok":true,"enabled":true}`

### DELETE `/points`
- 介绍：批量删除情报点
- 请求体：`["point-id-1","point-id-2"]`
- 返回：`{"deleted":2}`

## 5. 任务与队列

### GET `/tasks`
- 介绍：查看调度/执行队列中的任务
- 查询：`status_filter?`、`page`、`limit`
- 返回：`TaskPublic[]`

### GET `/pending`
- 介绍：查看待确认文章列表
- 查询：`page`、`limit`
- 返回：`PendingArticlePublic[]`

### POST `/pending/confirm`
- 介绍：批量确认待文章并向量入库
- 请求体：`{"ids":["pending-1","pending-2"]}`
- 返回：`{"confirmed":2}`

### POST `/pending/reject`
- 介绍：批量标记为已排除
- 请求体：`{"ids":["pending-3"]}`
- 返回：`{"rejected":1}`

## 6. 文章

### GET `/articles`
- 介绍：按源名/点名筛选文章列表，分页返回
- 查询：`source_name?`、`point_name?`、`page`、`limit`
- 返回：`ArticlePublic[]`

### GET `/articles/{article_id}`
- 介绍：获取单篇文章详情
- 返回：`ArticlePublic`

## 7. 数据模型说明

- `SourcePublic`：`id`、`name`、`main_url`、`points_count`、`articles_count`、`created_at`
- `PointPublic`：`id`、`source_id`、`source_name`、`name`、`url`、`cron_schedule`、`is_active`、`mode`、`url_filters[]?`、`extra_hint?`、`enable_pagination?`、`initial_pages?`、`last_crawl_time?`、`created_at`
- `TaskPublic`：`id`、`source_name`、`point_name`、`task_type`、`url`、`status`、`start_time?`、`end_time?`、`retry_count`、`created_at`
- `PendingArticlePublic`：`id`、`point_id?`、`source_name`、`point_name`、`original_url`、`title`、`publish_date?`、`content`、`status`、`created_at`、`updated_at`
- `ArticlePublic`：`id`、`point_id?`、`title`、`original_url`、`publish_date?`、`content`、`source_name`、`point_name`、`is_atomic?`、`created_at`、`updated_at`

## 8. 使用示例

1) 登录获取Token：
```
POST /api/user/login
{"email":"test@intelligenceworker.com","password":"test.0316!"}
```

2) 创建情报点：
```
POST /api/intelligence_collection/points
Authorization: Bearer <token>
{"source_name":"盖世汽车","name":"行业新闻","url":"https://auto.gasgoo.com/","cron_schedule":"*/30 * * * *"}
```

3) 查看待确认：
```
GET /api/intelligence_collection/pending
Authorization: Bearer <token>
```

4) 批量确认：
```
POST /api/intelligence_collection/pending/confirm
Authorization: Bearer <token>
{"ids":["pending-1","pending-2"]}
```


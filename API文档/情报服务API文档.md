# Intelligence Collection 服务 API 文档

## 认证
- 所有接口均需携带 `Authorization: Bearer <token>`

## 源管理

- 接口：`POST /api/intelligence_collection/sources`
- 功能详细说明：创建情报源。
- 传入字段及说明：`name` 源名称；`main_url` 主页URL。
- 返回字段及说明：源对象。
- 返回示例：
```json
{"id":"uuid","name":"汽车之家","main_url":"https://www.autohome.com.cn/","points_count":0,"articles_count":0,"created_at":"2025-12-04T11:00:00+08:00"}
```

- 接口：`GET /api/intelligence_collection/sources`
- 功能详细说明：列出所有情报源。
- 传入字段及说明：无。
- 返回字段及说明：源对象数组。
- 返回示例：`[{...}]`

- 接口：`DELETE /api/intelligence_collection/sources/{source_name}`
- 功能详细说明：删除指定情报源并自动删除其所有情报点、该源下的任务。
- 传入字段及说明：路径参数 `source_name`。
- 返回字段及说明：`deleted_source`、`deleted_points`、`deleted_tasks`。
- 返回示例：
```json
{"deleted_source":"汽车之家","deleted_points":3,"deleted_tasks":24}
```

## 情报点管理

- 接口：`POST /api/intelligence_collection/points`
- 功能详细说明：创建情报点（抓取列表页）。
- 传入字段及说明：`source_name` 源名；`name` 点名；`url` 列表页URL；`cron_schedule` 定时表达式；可选：`mode`、`url_filters[]`、`extra_hint`、`enable_pagination`、`initial_pages`。
- 返回字段及说明：点对象。
- 返回示例：`{"id":"uuid",...}`

- 接口：`GET /api/intelligence_collection/points?source_name=...`
- 功能详细说明：分页列出情报点，支持按源过滤。
- 传入字段及说明：`source_name` 可选。
- 返回字段及说明：点对象数组。
- 返回示例：`[{...}]`

- 接口：`POST /api/intelligence_collection/points/{point_id}/toggle`
- 功能详细说明：启停情报点。
- 传入字段及说明：`enable` 布尔。
- 返回字段及说明：`ok`、`enabled`。
- 返回示例：`{"ok":true,"enabled":true}`

- 接口：`DELETE /api/intelligence_collection/points`
- 功能详细说明：批量删除情报点。
- 传入字段及说明：请求体 `ids[]`。
- 返回字段及说明：`deleted` 删除数量。
- 返回示例：`{"deleted":2}`

- 接口：`POST /api/intelligence_collection/points/{point_id}/run-now`
- 功能详细说明：立即为该点创建一条“列表爬取”任务。
- 传入字段及说明：路径参数 `point_id`。
- 返回字段及说明：`created_tasks`、`point_id`。
- 返回示例：`{"created_tasks":1,"point_id":"uuid"}`

## 任务与待审

- 接口：`GET /api/intelligence_collection/tasks?status_filter=等待中|执行中|已完成|已失败&page=1&limit=20`
- 功能详细说明：分页列出采集任务。
- 传入字段及说明：`status_filter` 可选；`page`；`limit`。
- 返回字段及说明：任务对象数组。
- 返回示例：`[{...}]`

- 接口：`GET /api/intelligence_collection/pending?page=1&limit=20`
- 功能详细说明：分页列出待审文章。
- 传入字段及说明：`page`；`limit`。
- 返回字段及说明：待审对象数组。
- 返回示例：`[{...}]`

- 接口：`POST /api/intelligence_collection/pending/confirm`
- 功能详细说明：批量确认待审文章并入库向量化。
- 传入字段及说明：请求体 `ids[]`。
- 返回字段及说明：`confirmed` 数量。
- 返回示例：`{"confirmed":5}`

- 接口：`POST /api/intelligence_collection/pending/reject`
- 功能详细说明：批量排除待审文章。
- 传入字段及说明：请求体 `ids[]`。
- 返回字段及说明：`rejected` 数量。
- 返回示例：`{"rejected":2}`

## 文章管理

- 接口：`POST /api/intelligence_collection/articles/delete`
- 功能详细说明：批量删除文章，并同步删除 `intelligence_collection_article_vectors` 的向量。
- 传入字段及说明：请求体 `ids[]` 文章ID列表。
- 返回字段及说明：`deleted_articles`、`deleted_vectors`。
- 返回示例：
```json
{"deleted_articles":3,"deleted_vectors":12}
```

## 重复控制

- 列表爬取生成“文章爬取”任务时，按 `task_type='文章爬取' + url` 去重（`services/intelligence_collection/worker.py:180-189`）。
- 待审确认入库时，按 `intelligence_collection_articles.original_url` 唯一约束查重（`services/intelligence_collection/services.py:373-377`）。


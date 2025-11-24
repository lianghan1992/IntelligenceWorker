# 爬虫服务 API 文档

说明：本文件基于 `services/crawler/router.py` 的实际实现，遵循 `services/intelligence/API_Documentation.md` 的字段风格进行整理，供前后端及集成方使用。

## 基础信息
- 服务模块：`crawler`
- 认证：所有接口默认需要认证；使用项目统一的认证机制（参考主服务）。

## 接口列表

### 获取文章HTML报告
- 路径：`/crawler/articles/{article_id}/html`
- 方法：`GET`
- 认证：需要Bearer Token
- 响应：
  - `200`：返回该文章的HTML内容（`text/html`）
  - `404`：未找到对应的HTML报告文件
  - `500`：服务器读取失败

**cURL示例**
```bash
curl -X GET "http://127.0.0.1:7657/crawler/articles/<article_id>/html" \
 -H "Authorization: Bearer <token>"
```

### 获取任务统计
- 路径：`/crawler/tasks/stats`
- 方法：`GET`
- 请求：无额外体参数
- 响应：
  - `200`：
    ```json
    {
      "sources": 12,
      "points": 34,
      "active_points": 28,
      "articles": 1024,
      "vectors": 40960,
      "schedules_active": 18
    }
    ```

### 基于提示词的LLM相关性检索并导出CSV（含进度）
- 路径：`/crawler/search/llm`
- 方法：`POST`
- 请求：
  ```json
  {
    "query_text": "我需要查找岚图泰山车型的所有相关信息",
    "publish_date_start": "2025-01-01",
    "publish_date_end": "2025-11-18",
    "source_names": ["盖世汽车", "艾邦智造"]
  }
  ```
- 响应：
  ```json
  {
    "task_id": "<uuid>",
    "total_articles": 1000,
    "processed_count": 432,
    "matched_count": 128,
    "unrelated_count": 304,
    "task_dir": "services/crawler/search_tasks/<uuid>"
  }
  ```

### 查询LLM检索任务（分页，含统计）
- 路径：`/crawler/search/tasks`
- 方法：`GET`
- 查询参数：`page`、`limit`
- 响应：
  ```json
  {
    "total": 12,
    "page": 1,
    "limit": 20,
    "stats": {
      "total_tasks": 12,
      "total_articles": 5432,
      "processed_count": 2310,
      "matched_count": 789,
      "unrelated_count": 1521
    },
    "items": [
      {
        "id": "<uuid>",
        "prompt_text": "...",
        "total_articles": 1000,
        "processed_count": 432,
        "matched_count": 128,
        "unrelated_count": 304,
        "task_dir": "services/crawler/search_tasks/<uuid>",
        "created_at": "2025-11-18T12:00:00+08:00",
        "finished_at": "2025-11-18T12:15:00+08:00"
      }
    ]
  }
  ```

### 查询单个LLM检索任务详情
- 路径：`/crawler/search/tasks/{task_id}`
- 方法：`GET`
- 响应：
  ```json
  {
    "id": "<uuid>",
    "prompt_text": "...",
    "source_names": "盖世汽车,艾邦智造",
    "publish_date_start": "2025-01-01",
    "publish_date_end": "2025-11-18",
    "total_processed": 1000,
    "matched_count": 300,
    "tokens_with_content_estimate": 123456,
    "tokens_without_content_estimate": 78901,
    "duration_seconds": 900,
    "processed_time_beijing": "2025-11-18 12:00:00",
    "task_dir": "services/crawler/search_tasks/<uuid>",
    "created_at": "2025-11-18T12:00:00+08:00",
    "finished_at": "2025-11-18T12:15:00+08:00"
  }
  ```

### 下载任务的CSV文件（实时生成）
- 路径：`/crawler/search/tasks/{task_id}/download`
- 方法：`GET`
- 查询参数：`with_content=true|false`（默认 true）
- 支持压缩包下载：设置 `both=true` 时同时打包含原文与不含原文两个 CSV
- 响应：文件下载（`related_with_content.csv` 或 `related_no_content.csv`）
  - 当任务进行中，CSV 会实时写入，可多次下载获取最新内容

### 任务进度
- 任务创建后，接口返回的 `task_id` 可用于实时查询进度：
  - 进度字段：`total_articles`、`processed_count`、`matched_count`、`unrelated_count`
  - 详情接口：`GET /crawler/search/tasks/{task_id}` 会随着处理过程更新 `task.json` 中的统计并反映到 API 返回

### 获取所有情报源名称
- 路径：`/crawler/sources/names`
- 方法：`GET`
- 响应：
  ```json
  [
    "盖世汽车",
    "艾邦智造",
    "AutoTechNews",
    "佐思汽研"
  ]
  ```

### Gemini Cookie 管理
- 检查 Cookie 是否有效：`GET /crawler/gemini/cookies/check`
  - 返回：
    ```json
    {"has_cookie":true, "valid":true}
    ```
  - cURL：
    ```bash
    curl -X GET http://127.0.0.1:7657/api/crawler/gemini/cookies/check \
      -H "Authorization: Bearer <token>"
    ```

- 更新 Cookie：`POST /crawler/gemini/cookies`
  - 请求：`multipart/form-data`
    - 字段：`secure_1psid`, `secure_1psidts`, `http_proxy`(可选)
  - 返回：
    ```json
    {"ok":true}
    ```
  - cURL：
    ```bash
    curl -X POST http://127.0.0.1:7657/api/crawler/gemini/cookies \
      -H "Authorization: Bearer <token>" \
      -F "secure_1psid=<cookie>" -F "secure_1psidts=<cookie_ts>"
    ```
### 文章检索（分页）
- 路径：`/crawler/articles`
- 方法：`POST`
- 请求：
  ```json
  {
    "filters": {
      "point_ids": [1, 2],
      "source_names": ["盖世汽车"],
      "publish_date_start": "2024-01-01T00:00:00",
      "publish_date_end": "2024-12-31T23:59:59",
      "min_influence_score": 0.2,
      "sentiment": ["positive", "neutral", "negative"]
    },
    "page": 1,
    "limit": 20
  }
  ```
- 响应：
  - `200`：
    ```json
    {
      "items": [
        {
          "id": 1001,
          "point_id": 2,
          "source_name": "盖世汽车",
          "title": "示例标题",
          "original_url": "https://example.com/article/1001",
          "publish_date": "2024-04-12T08:30:00",
          "created_at": "2024-04-12T08:31:00",
          "summary": "可选的自动摘要",
          "sentiment": "neutral",
          "influence_score": 0.35
        }
      ],
      "total": 1234
    }
    ```

### 语义搜索（向量检索）
- 路径：`/crawler/search/semantic`
- 方法：`POST`
- 请求：
  ```json
  {
    "query": "电池热管理",
    "top_k": 10,
    "min_score": 0.2
  }
  ```
- 响应：
  - `200`：
    ```json
    {
      "items": [
        {
          "article_id": 1001,
          "content_chunk": "与查询语义相近的文本片段",
          "score": 0.82
        }
      ]
    }
    ```

### 组合筛选 + 语义搜索
- 路径：`/crawler/search/combined`
- 方法：`POST`
- 请求：
  ```json
  {
    "filters": {
      "point_ids": ["<point_id>", "<point_id>"] ,
      "source_names": ["盖世汽车"],
      "publish_date_start": "2024-01-01",
      "publish_date_end": "2024-12-31"
    },
    "query": "智能驾驶域控制器", 
    "query_text": "智能驾驶域控制器", 
    "top_k": 20,
    "min_score": 0.5,
    "similarity_threshold": 0.5,
    "page": 1,
    "limit": 20
  }
  ```
- 响应：
  - `200`：同语义搜索，返回满足结构化筛选条件后的向量检索结果。
 - 兼容性说明：`query` 与 `query_text` 等价；`min_score` 与 `similarity_threshold` 等价。若查询文本为 `"*"`，仅进行结构化筛选与分页。

**cURL示例**
```bash
curl -X POST "http://127.0.0.1:7657/crawler/search/combined" \
 -H "Authorization: Bearer <token>" \
 -H "Content-Type: application/json" \
 -d '{
  "filters": {"source_names": ["盖世汽车"], "publish_date_start": "2024-01-01"},
  "query_text": "电池热管理",
  "page": 1,
  "limit": 20,
  "similarity_threshold": 0.5
}'
```

### 情报信息流（分页）
- 路径：`/crawler/feed`
- 方法：`POST`
- 请求：
  ```json
  {
    "filters": {
      "point_ids": [1, 2],
      "source_names": ["盖世汽车"],
      "publish_date_start": "2024-01-01T00:00:00",
      "publish_date_end": "2024-12-31T23:59:59",
      "min_influence_score": 0.2,
      "sentiment": ["neutral"]
    },
    "page": 1,
    "limit": 20
  }
  ```
- 响应：
  - `200`：
    ```json
    {
      "items": [CollectedArticlePublic],
      "total": 1234
    }
    ```

### 实时更新 Gemini Cookie
- 路径：`/crawler/gemini/cookies`
- 方法：`POST`
- 认证：需要Bearer Token
- 请求：
  ```json
  {
    "secure_1psid": "<__Secure-1PSID>",
    "secure_1psidts": "<__Secure-1PSIDTS>",
    "http_proxy": "http://127.0.0.1:20171"
  }
  ```
- 响应：
  - `200`：`{"message": "Gemini cookies updated", "initialized": true}`
  - `400`：更新失败，返回错误原因
- 说明：
  - 该接口会在不重启服务的情况下，重建 Gemini 客户端并在持久事件循环中进行初始化（最多两次）；成功后立即生效。
  - 若 `.env` 中已启用代理，则无需传 `http_proxy`。
  
**cURL示例**
```bash
curl -X POST "http://127.0.0.1:7657/crawler/gemini/cookies" \
 -H "Authorization: Bearer <token>" \
 -H "Content-Type: application/json" \
 -d '{
  "secure_1psid": "sid...",
  "secure_1psidts": "sidts...",
  "http_proxy": "http://127.0.0.1:20171"
}'
```

## 说明与约束
- 分页参数：`page` 从 1 开始，`limit` 建议不超过 50。
- 时间字段：遵循 ISO 8601 格式，示例 `YYYY-MM-DDTHH:mm:ss`。
- 认证失败返回 `401`；参数校验失败返回 `422`。
- 语义搜索由模块内置的向量引擎提供，底层可选择本地或 ZhipuAI 嵌入模型，取决于 `services/crawler/.env` 配置。

## 版本
- v1.0.0（与当前代码一致）
### 下载文章PDF（HTML已生成的前提下）
- 路径：`/crawler/articles/{article_id}/pdf`
- 方法：`GET`
- 认证：需要Bearer Token
- 行为：仅当对应文章的HTML已存在时才进行转换；每次请求若未存在PDF则即时转换并返回文件下载。
- 响应：
  - `200`：返回PDF二进制文件
  - `404`：未找到对应的HTML报告文件（不进行转换）
  - `500`：服务端转换失败

**cURL示例**
```bash
curl -X GET "http://127.0.0.1:7657/crawler/articles/<article_id>/pdf" \
 -H "Authorization: Bearer <token>" -o <article_id>.pdf
```
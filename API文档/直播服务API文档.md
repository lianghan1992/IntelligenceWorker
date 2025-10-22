# 直播服务 (Livestream Service) API 文档

提供一个统一的API来管理直播任务的整个生命周期，从创建、录制到分析。所有接口均以 `/livestream` 为前缀，并需要Bearer Token认证。

## 1. 创建直播任务

创建一个新的直播任务。此操作会在后台自动调用 `bililive-go` 来创建实际的录制任务，并将所有信息记录到数据库中。

-   **路径:** `/livestream/tasks`
-   **方法:** `POST`
-   **认证:** 需要Bearer Token
-   **Content-Type:** `multipart/form-data`

**请求说明 (Form Data)**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `url` | string | 是 | 直播间URL |
| `livestream_name` | string | 是 | 直播名称 |
| `entity` | string | 否 | 关联的实体名称 (如: 小米汽车) |
| `start_time` | string | 是 | 直播开始时间 (ISO格式, e.g., `2025-01-20T10:00:00Z`) |
| `prompt_file` | string | 否 | 用于AI分析的提示词文件名称 |
| `image` | file | 否 | 直播间封面图片文件 |

**cURL请求示例**
```bash
curl -X POST http://127.0.0.1:7657/livestream/tasks \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
-F "url=https://live.bilibili.com/12345" \
-F "livestream_name=新车发布会" \
-F "entity=小米汽车" \
-F "start_time=2025-10-21T14:00:00Z" \
-F "prompt_file=01.车企发布会摘要总结.md" \
-F "image=@/path/to/cover.jpg"
```

**返回示例 (201 Created)**

返回新创建的任务对象。

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "url": "https://live.bilibili.com/12345",
  "livestream_name": "新车发布会",
  "entity": "小米汽车",
  "start_time": "2025-10-21T14:00:00Z",
  "status": "pending",
  "bililive_live_id": "abcdef1234567890",
  "host_name": "主播名称",
  "prompt_content": "完整的提示词内容...",
  "livestream_image": "data:image/jpeg;base64, புகைப்படம்...",
  "summary_report": null,
  "created_at": "2025-10-21T13:00:00Z",
  "updated_at": "2025-10-21T13:00:00Z"
}
```

## 2. 获取直播任务列表 (分页、筛选、排序)

获取系统中所有直播任务的列表，支持分页、状态筛选、关键词搜索和排序。

-   **路径:** `/livestream/tasks`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**查询参数**

| 参数 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `page` | integer | 1 | 请求的页码 |
| `limit` | integer | 20 | 每页返回的数量 |
| `status` | string | (无) | 按任务状态筛选 (e.g., `completed`, `recording`) |
| `search_term` | string | (无) | 模糊搜索关键词 (匹配直播名称或主播名) |
| `sort_by` | string | `created_at` | 排序字段 (`created_at`, `start_time`, `status`, `livestream_name`) |
| `order` | string | `desc` | 排序方向 (`asc` 或 `desc`) |

**cURL请求示例**
```bash
# 获取第一页，每页10个，状态为recording，并按开始时间升序排序
curl -X GET "http://127.0.0.1:7657/livestream/tasks?page=1&limit=10&status=recording&sort_by=start_time&order=asc" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**

返回一个包含分页元数据和当前页任务列表的对象。

```json
{
  "items": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "url": "https://live.bilibili.com/12345",
      "livestream_name": "新车发布会",
      "start_time": "2025-10-21T14:00:00Z",
      "status": "recording",
      "bililive_live_id": "abcdef1234567890",
      "host_name": "主播名称",
      "prompt_content": "完整的提示词内容...",
      "livestream_image": "data:image/jpeg;base64, புகைப்படம்...",
      "summary_report": null,
      "created_at": "2025-10-21T13:00:00Z",
      "updated_at": "2025-10-21T14:05:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 10,
  "totalPages": 15
}
```

## 3. 获取单个直播任务

获取指定ID的直播任务的详细信息。

-   **路径:** `/livestream/tasks/{task_id}`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**cURL请求示例**
```bash
curl -X GET http://127.0.0.1:7657/livestream/tasks/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**

返回单个任务对象，包含任务状态（`listening`, `recording`, `processing`, `completed`, `failed`）和可能的总结报告。

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "url": "https://live.bilibili.com/12345",
  "livestream_name": "新车发布会",
  "start_time": "2025-10-21T14:00:00Z",
  "status": "recording",
  "bililive_live_id": "abcdef1234567890",
  "host_name": "主播名称",
  "prompt_content": "完整的提示词内容...",
  "livestream_image": "data:image/jpeg;base64, புகைப்படம்...",
  "summary_report": null,
  "created_at": "2025-10-21T13:00:00Z",
  "updated_at": "2025-10-21T14:05:00Z"
}
```

## 4. 获取任务统计

快速获取各种状态的任务数量，用于仪表盘或概览展示。

-   **路径:** `/livestream/tasks/stats`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**cURL请求示例**
```bash
curl -X GET http://127.0.0.1:7657/livestream/tasks/stats \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**
```json
{
  "total": 150,
  "pending": 5,
  "listening": 10,
  "recording": 3,
  "processing": 2,
  "completed": 128,
  "failed": 2
}
```

## 4. 开始监听任务

手动触发对一个任务的监听。通常在任务创建后会自动开始监听。

-   **路径:** `/livestream/tasks/{task_id}/listen/start`
-   **方法:** `POST`
-   **认证:** 需要Bearer Token

**cURL请求示例**
```bash
curl -X POST http://127.0.0.1:7657/livestream/tasks/a1b2c3d4-e5f6-7890-abcd-ef1234567890/listen/start \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**
```json
{
  "task_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "success",
  "message": "Started listening to the livestream."
}
```

## 5. 停止监听任务

手动停止对一个任务的监听。

-   **路径:** `/livestream/tasks/{task_id}/listen/stop`
-   **方法:** `POST`
-   **认证:** 需要Bearer Token

**cURL请求示例**
```bash
curl -X POST http://127.0.0.1:7657/livestream/tasks/a1b2c3d4-e5f6-7890-abcd-ef1234567890/listen/stop \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**
```json
{
  "task_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "success",
  "message": "Stopped listening to the livestream."
}
```

## 6. 删除任务

从系统中删除一个任务。此操作会同时从数据库和 `bililive-go` 中删除该任务。

-   **路径:** `/livestream/tasks/{task_id}`
-   **方法:** `DELETE`
-   **认证:** 需要Bearer Token

**cURL请求示例**
```bash
curl -X DELETE http://127.0.0.1:7657/livestream/tasks/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**
```json
{
  "task_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "success",
  "message": "Task deleted successfully."
}
```

## 7. 获取所有提示词

获取系统中所有可用提示词的列表及其内容。

-   **路径:** `/livestream/prompts`
-   **方法:** `GET`
-   **认证:** 无

**cURL请求示例**
```bash
curl -X GET http://127.0.0.1:7657/livestream/prompts
```

**返回示例 (200 OK)**
```json
[
  {
    "name": "00.默认总结提示词.md",
    "content": "请您作为..."
  },
  {
    "name": "01.车企发布会摘要总结.md",
    "content": "1. 发布会核心亮点速览..."
  }
]
```

## 8. 更新提示词

更新指定提示词文件的内容。

-   **路径:** `/livestream/prompts/{prompt_name}`
-   **方法:** `POST`
-   **认证:** 需要Bearer Token
-   **Content-Type:** `application/json`

**路径参数**

| 参数 | 类型 | 说明 |
| :--- | :--- | :--- |
| `prompt_name` | string | 要更新的提示词文件名 (例如 `01.车企发布会摘要总结.md`) |

**请求体 (JSON)**
```json
{
  "content": "新的提示词内容..."
}
```

**cURL请求示例**
```bash
curl -X POST http://127.0.0.1:7657/livestream/prompts/01.车企发布会摘要总结.md \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "content": "这是新的提示词内容。"
}'
```

**返回示例 (200 OK)**
```json
{
  "name": "01.车企发布会摘要总结.md",
  "content": "这是新的提示词内容。"
}
```

## 9. 追加历史任务

允许用户上传已经存在的发布会总结报告，将其作为一条已完成的历史任务存入数据库。

-   **路径:** `/livestream/tasks/history`
-   **方法:** `POST`
-   **认证:** 需要Bearer Token
-   **Content-Type:** `application/json`

**请求体 (JSON)**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `url` | string | 是 | 一个关联的URL（如官网、历史直播链接等） |
| `livestream_name` | string | 是 | 发布会的正式名称，用于前端展示 |
| `start_time` | string | 是 | 发布会的实际开始时间 (ISO格式, e.g., `2024-01-20T10:00:00Z`) |
| `summary_report` | string | 是 | 已经总结好的Markdown格式的报告全文 |
| `host_name` | string | 否 | 公司或主播的名称。如果省略，将默认使用 `livestream_name` 的值。 |
| `entity` | string | 否 | 关联的实体名称 (如: 小米汽车) |
| `livestream_image` | string | 否 | Base64编码的封面图片字符串 |

**cURL请求示例**
```bash
curl -X POST http://127.0.0.1:7657/livestream/tasks/history \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "url": "https://example.com/history_event",
  "livestream_name": "2023年度技术大会",
  "entity": "某科技公司",
  "start_time": "2023-12-20T10:00:00Z",
  "summary_report": "# 2023年度技术大会总结...",
  "host_name": "某科技公司",
  "livestream_image": "data:image/jpeg;base64, புகைப்படம்..."
}'
```

**返回示例 (201- Created)**

返回新创建的历史任务对象，其`status`字段为`completed`。

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "url": "https://example.com/history_event",
  "livestream_name": "2023年度技术大会",
  "entity": "某科技公司",
  "start_time": "2023-12-20T10:00:00Z",
  "status": "completed",
  "bililive_live_id": null,
  "host_name": "某科技公司",
  "prompt_content": "默认提示词的完整内容...",
  "livestream_image": "data:image/jpeg;base64, புகைப்படம்...",
  "summary_report": "# 2023年度技术大会总结...",
  "created_at": "2023-12-20T10:00:00Z",
  "updated_at": "2023-12-20T10:00:00Z"
}
```

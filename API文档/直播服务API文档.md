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

## 3. 获取公开直播任务列表 (分页、排序)

获取系统中所有直播任务的公开列表，支持分页和排序。此接口仅返回部分公开字段，不包含敏感信息。

-   **路径:** `/livestream/public_tasks`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**查询参数**

| 参数 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `page` | integer | 1 | 请求的页码 |
| `limit` | integer | 20 | 每页返回的数量 |
| `sort_by` | string | `start_time` | 排序字段 (`start_time`, `livestream_name`) |
| `order` | string | `desc` | 排序方向 (`asc` 或 `desc`) |

**cURL请求示例**
```bash
# 获取第一页，每页10个，并按开始时间升序排序
curl -X GET "http://127.0.0.1:7657/livestream/public_tasks?page=1&limit=10&sort_by=start_time&order=asc" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**

返回一个包含分页元数据和当前页公开任务列表的对象。

```json
{
  "items": [
    {
      "url": "https://live.bilibili.com/12345",
      "livestream_name": "新车发布会",
      "start_time": "2025-10-21T14:00:00Z",
      "status": "recording",
      "host_name": "主播名称",
      "livestream_image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...",
      "summary_report": null
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 10,
  "totalPages": 15
}
```

## 5. 获取单个直播任务

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
  "summary_report": null,
  "created_at": "2025-10-21T13:00:00Z",
  "updated_at": "2025-10-21T14:05:00Z"
}
```

## 6. 获取任务统计

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

## 7. 开始监听任务

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

## 8. 停止监听任务

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

## 9. 删除任务

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

## 10. 获取所有提示词

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

## 11. 更新提示词

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

## 12. 追加历史任务

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

**返回示例 (201 Created)**

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

## 13. 获取任务分析日志

获取指定任务在分析过程中生成的详细日志文件。

-   **路径:** `/livestream/tasks/{task_id}/log`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**cURL请求示例**
```bash
curl -X GET http://127.0.0.1:7657/livestream/tasks/a1b2c3d4-e5f6-7890-abcd-ef1234567890/log \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**
```json
{
  "log_content": "2025-10-23 10:00:00,123 - INFO - 🎬 开始分析视频...\n2025-10-23 10:00:05,456 - INFO - 🎞️ 视频抽帧完成...\n..."
}
```

## 14. 获取任务原始文稿 (JSON 或 Markdown)

获取指定任务分析后产出的原始文稿，支持JSON和Markdown两种格式。

-   **路径:** `/livestream/tasks/{task_id}/manuscript`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**查询参数**

| 参数 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `format` | string | `json` | 请求的文稿格式，可选值为 `json` 或 `md`。 |

---

**使用示例 1: 获取JSON格式 (默认)**

**cURL请求示例**
```bash
# format=json (或不提供format参数)
curl -X GET "http://127.0.0.1:7657/livestream/tasks/a1b2c3d4.../manuscript?format=json" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**

直接返回 `01_raw_manuscript.json` 文件解析后的内容。

```json
{
  "title": "汽车发布会原始文字稿",
  "total_frames": 41,
  "data": [
    {
      "frame_number": 1,
      "filename": "frame_00001.png",
      "content": "磁浮路感 贴地飞行..."
    }
  ]
}
```

---

**使用示例 2: 获取Markdown格式**

**cURL请求示例**
```bash
curl -X GET "http://127.0.0.1:7657/livestream/tasks/a1b2c3d4.../manuscript?format=md" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**

返回一个包含Markdown纯文本内容的JSON对象。

```json
{
  "format": "md",
  "content": "# 汽车发布会原始文字稿\n\n--- (帧序号: 1 | ...\n..."
}
```

---

## 15. 重新触发AI分析 (Re-trigger Analysis)

**路径:** `/livestream/tasks/{task_id}/re-analyze`

**方法:** `POST`

**认证:** 需要Bearer Token

**说明:**
手动重新触发对一个指定任务的分析流程。该接口具有智能判断能力：
- 如果任务目录中已经存在 `01_raw_manuscript.json` 文件，则只会重新执行AI总结步骤。
- 如果原始稿件不存在，则会从头开始执行完整的视频分析流程（包括视频拼接、抽帧、OCR、总结等）。

此功能在AI总结效果不佳、需要使用不同提示词重新总结，或早期分析步骤失败时非常有用。

**路径参数:**
- `task_id` (string, required): 需要重新分析的任务的唯一ID。

**请求体:**
- (无)

**cURL请求示例**
```bash
curl -X POST http://127.0.0.1:7657/livestream/tasks/a1b2c3d4-e5f6-7890-abcd-ef1234567890/re-analyze \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**成功响应 (200 OK):**
```json
{
  "task_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "success",
  "message": "Task analysis has been re-triggered."
}
```

**错误响应:**
- `404 Not Found`: 当提供的 `task_id` 不存在时返回。
- `500 Internal Server Error`: 当后台处理发生意外错误时返回。

---

## 16. WebSocket 实时通知

直播服务提供 WebSocket 接口，用于实时推送任务状态变化、创建和删除等事件通知。

### 16.1 WebSocket 端点

#### 通用 WebSocket 连接
- **端点:** `ws://localhost:7657/ws`
- **认证:** 需要在连接时提供 `token` 查询参数
- **功能:** 接收所有类型的系统通知

#### 直播服务专用连接
- **端点:** `ws://localhost:7657/ws/livestream`
- **认证:** 需要在连接时提供 `token` 查询参数
- **功能:** 专门接收直播任务相关的实时通知

#### 房间连接
- **端点:** `ws://localhost:7657/ws/room/{room_name}`
- **认证:** 需要在连接时提供 `token` 查询参数
- **功能:** 加入指定房间，接收房间内的消息广播

### 16.2 连接示例

```javascript
// 连接到直播服务专用 WebSocket
const ws = new WebSocket('ws://localhost:7657/ws/livestream?token=YOUR_JWT_TOKEN');

ws.onopen = function(event) {
    console.log('WebSocket 连接已建立');
};

ws.onmessage = function(event) {
    const message = JSON.parse(event.data);
    console.log('收到消息:', message);
};

ws.onclose = function(event) {
    console.log('WebSocket 连接已关闭');
};
```

### 16.3 消息格式

所有 WebSocket 消息都遵循统一的 JSON 格式：

```json
{
  "type": "message_type",
  "data": {
    // 具体的消息数据
  },
  "timestamp": "2025-01-20T10:30:00Z",
  "source": "livestream_service"
}
```

### 16.4 消息类型

#### 任务状态更新通知

当任务状态发生变化时（如从 pending 变为 listening，或从 processing 变为 completed），会发送此类通知。

```json
{
  "type": "task_status_update",
  "data": {
    "task_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "listening",
    "livestream_name": "新车发布会",
    "host_name": "主播名称",
    "updated_at": "2025-01-20T10:30:00Z"
  },
  "timestamp": "2025-01-20T10:30:00Z",
  "source": "livestream_service"
}
```

**状态值说明:**
- `pending`: 任务已创建，等待开始
- `listening`: 正在监听直播
- `recording`: 正在录制
- `processing`: 正在进行AI分析
- `completed`: 任务已完成
- `failed`: 任务失败

#### 任务创建通知

当新的直播任务被创建时发送。

```json
{
  "type": "task_created",
  "data": {
    "task_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "livestream_name": "新车发布会",
    "host_name": "主播名称",
    "start_time": "2025-01-20T14:00:00Z",
    "status": "pending"
  },
  "timestamp": "2025-01-20T10:30:00Z",
  "source": "livestream_service"
}
```

#### 任务删除通知

当直播任务被删除时发送。

```json
{
  "type": "task_deleted",
  "data": {
    "task_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "livestream_name": "新车发布会"
  },
  "timestamp": "2025-01-20T10:30:00Z",
  "source": "livestream_service"
}
```

#### 连接确认消息

WebSocket 连接建立成功后发送。

```json
{
  "type": "connection_established",
  "data": {
    "user_id": "user-uuid",
    "connection_id": "connection-uuid"
  },
  "timestamp": "2025-01-20T10:30:00Z",
  "source": "websocket_manager"
}
```

#### 错误消息

当发生错误时发送，如认证失败等。

```json
{
  "type": "error",
  "data": {
    "error_code": "AUTHENTICATION_FAILED",
    "message": "Invalid or expired token"
  },
  "timestamp": "2025-01-20T10:30:00Z",
  "source": "websocket_manager"
}
```

### 16.5 客户端集成示例

#### 基础 JavaScript 客户端

```javascript
class LivestreamWebSocketClient {
  constructor(token) {
    this.token = token;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    const wsUrl = `ws://localhost:7657/ws/livestream?token=${this.token}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket 连接已建立');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = () => {
      console.log('WebSocket 连接已关闭');
      this.handleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket 错误:', error);
    };
  }

  handleMessage(message) {
    switch (message.type) {
      case 'task_status_update':
        this.onTaskStatusUpdate(message.data);
        break;
      case 'task_created':
        this.onTaskCreated(message.data);
        break;
      case 'task_deleted':
        this.onTaskDeleted(message.data);
        break;
      case 'connection_established':
        console.log('连接确认:', message.data);
        break;
      case 'error':
        console.error('服务器错误:', message.data);
        break;
    }
  }

  onTaskStatusUpdate(data) {
    console.log(`任务 ${data.task_id} 状态更新为: ${data.status}`);
    // 在这里更新 UI 中的任务状态
  }

  onTaskCreated(data) {
    console.log(`新任务创建: ${data.livestream_name}`);
    // 在这里添加新任务到 UI
  }

  onTaskDeleted(data) {
    console.log(`任务已删除: ${data.task_id}`);
    // 在这里从 UI 中移除任务
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, 1000 * this.reconnectAttempts);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// 使用示例
const client = new LivestreamWebSocketClient('your-jwt-token');
client.connect();
```

#### React Hook 示例

```javascript
import { useState, useEffect, useRef } from 'react';

export const useLivestreamWebSocket = (token) => {
  const [isConnected, setIsConnected] = useState(false);
  const [tasks, setTasks] = useState([]);
  const ws = useRef(null);

  useEffect(() => {
    if (!token) return;

    const wsUrl = `ws://localhost:7657/ws/livestream?token=${token}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setIsConnected(true);
    };

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'task_status_update':
          setTasks(prev => prev.map(task => 
            task.id === message.data.task_id 
              ? { ...task, status: message.data.status }
              : task
          ));
          break;
        case 'task_created':
          setTasks(prev => [...prev, message.data]);
          break;
        case 'task_deleted':
          setTasks(prev => prev.filter(task => task.id !== message.data.task_id));
          break;
      }
    };

    ws.current.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [token]);

  return { isConnected, tasks };
};
```

### 16.6 最佳实践

1. **认证管理**: 确保 JWT Token 有效，在 Token 过期前及时刷新
2. **重连机制**: 实现自动重连逻辑，处理网络中断情况
3. **错误处理**: 妥善处理各种错误消息和异常情况
4. **性能优化**: 避免在消息处理中执行耗时操作
5. **内存管理**: 及时清理不再需要的事件监听器和数据

更多详细的 WebSocket 设计和使用指南，请参考 [WebSocket 设计指南](../../WebSocket_Design_Guide.md)。
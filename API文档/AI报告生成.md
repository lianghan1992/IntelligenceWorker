# StratifyAI Service API 文档 (Plumber Mode)

StratifyAI 服务采用“前端驱动业务，后端提供能力”的架构。后端主要负责 LLM 流式转发和数据持久化。

- **Base URL**: `/stratifyai`
- **认证方式**: Bearer Token (`Authorization: Bearer <token>`)

---

## 1. 核心流式接口 (The Plumber)

### 1.1 获取可用模型列表
- **URL**: `GET /common/models`
- **响应**: `application/json`

**功能说明**:
获取当前系统允许使用的模型白名单列表。前端在传递 `model_override` 参数时，必须确保值存在于此列表中。

**响应示例**:
```json
[
  "zhipu@glm-4-flash",
  "openrouter@tngtech/deepseek-r1t2-chimera:free",
  "gemini_cookie@gemini-2.5-flash",
  "gemini_cookie@gemini-2.5-pro",
  "gemini_api@gemini-1.5-flash"
]
```

---

### 1.2 通用生成流
- **URL**: `POST /generate/stream`
- **Content-Type**: `application/json`
- **响应**: `text/event-stream` (Server-Sent Events)

**功能说明**:
该接口是所有 LLM 交互的核心驱动器。
- **任务阶段执行**: 前端在执行任务的某个具体阶段（如“生成大纲”）时，调用此接口，传入 `task_id` 和 `phase_name`。接口在生成完成后会自动更新任务状态。
- **自由对话**: 如果仅提供 `session_id` 而不提供 `task_id`，则视为普通的自由对话或对内容的修订。
- **多模态支持**: 支持通过 `attachments` 传入文件（需先上传）。

**请求参数**:
```json
{
  "prompt_name": "01_generate_outline", // 提示词标识。对应场景下的文件名 (e.g., "01_generate_outline.md")
  "variables": {                     // 注入到 prompt 中的变量
    "user_input": "AI的未来",
    "reference_materials": "..."     // 可选
  },
  "scenario": "default",             // (可选) 场景名称，默认为 "default"。必须对应已存在的场景。
  "model_override": "zhipu@glm-4-flash",   // (可选) 指定模型。必须是 /common/models 接口返回的白名单模型之一，否则返回 400 错误。
  "session_id": "sess_...",          // (可选) 会话ID，用于继续之前的对话
  "task_id": "task_123...",          // (可选) 关联的任务ID。如果提供，生成结果会自动保存到任务的 result.phases 中
  "phase_name": "01_generate_outline", // (可选) 关联的任务阶段名称。需与 task_id 配合使用
  "attachments": [                   // (可选) 附件列表 (图片/文件)
    {
      "type": "image",               // 类型: image | file
      "url": "/srv/.../uploads/x.png" // 文件的绝对路径或 URL (需先调用上传接口获取)
    }
  ]
}
```

**模型选择优先级**:
1. `model_override` (请求参数)
2. `prompt.model` (提示词文件配置)
3. `scenario.default_model` (场景默认配置)
4. 系统默认逻辑 (analyze_input/outline/content 等专用默认)
5. `session.model` (会话历史模型)
6. 兜底默认 (zhipu@glm-4-flash)

**响应数据**:
SSE 事件流。
1. **第一条消息**: 返回本次生成的 `session_id`。
```
data: {"session_id": "sess_123abc..."}
```
2. **后续消息**: 内容流。
```json
data: {"content": "这"}
data: {"content": "是"}
data: {"content": "正文内容", "reasoning": "思考过程..."} 
```
> **注意**: `reasoning` 字段仅在支持思考的模型（如 DeepSeek-R1, Gemini-2.5-Flash 等）中才会返回。对于 Gemini Cookie 渠道，需确保选择了正确的思考模型（如 `gemini-2.5-flash`）。

3. **结束消息**:
```
data: [DONE]
```

---

### 1.3 通用文件上传
- **URL**: `POST /common/upload`
- **Content-Type**: `multipart/form-data`
- **响应**: `application/json`

**功能说明**:
用于上传图片或文档，供 LLM 分析使用。上传后会返回文件的本地路径或 URL，后续需将该 URL 放入 `/generate/stream` 的 `attachments` 字段中。

**请求参数**:
- `file`: (Binary) 文件内容

**响应示例**:
```json
{
  "filename": "chart.png",
  "url": "/srv/application/.../uploads/550e8400-e29b-41d4-a716-446655440000.png",
  "type": "image/png"
}
```

---

## 2. 场景与提示词管理 (Scenario Management)

**核心说明**: 场景（Scenario）是生成任务的模板，包含了该类任务所需的一组提示词文件。所有数据现已存储在数据库中。

### 2.1 获取场景列表
- **URL**: `GET /prompts/scenarios`
- **响应**:
```json
[
  {
    "id": "uuid-...",
    "name": "default",
    "title": "通用PPT生成",
    "description": "通用的汽车行业报告PPT生成场景",
    "default_model": "zhipu@glm-4-flash",
    "created_at": "...",
    "updated_at": "..."
  },
  {
    "id": "uuid-...",
    "name": "tech_eval",
    "title": "新技术评估",
    "description": "...",
    "default_model": "openrouter@anthropic/claude-3-5-sonnet"
  }
]
```

### 2.2 创建新场景
- **URL**: `POST /prompts/scenarios`
- **Body**:
```json
{
  "name": "new_scenario", // 内部标识符 (unique, required)
  "title": "新场景名称",   // 显示名称 (optional)
  "description": "描述",  // (optional)
  "default_model": "openrouter@tngtech/deepseek-r1t2-chimera:free" // 场景默认使用的渠道及模型 (optional)
}
```
- **说明**: 创建时**不再**自动生成默认提示词文件，需手动添加。如果不指定 `default_model`，且具体的提示词也没有指定模型，则会回退到系统默认模型。

### 2.3 修改场景信息
- **URL**: `PUT /prompts/scenarios/{scenario_id}`
- **Body**:
```json
{
  "name": "updated_name",
  "title": "更新后的标题",
  "description": "更新后的描述",
  "default_model": "zhipu@glm-4-flash" // 更新默认模型
}
```

### 2.4 删除场景
- **URL**: `DELETE /prompts/scenarios/{scenario_id}`
- **说明**: `default` 场景不可删除。

### 2.5 获取场景文件列表
- **URL**: `GET /prompts/scenarios/{scenario_id}/files`
- **响应**:
```json
[
  {
    "id": "uuid-...",
    "name": "00_analyze_input.md",
    "content": "...",
    "model": "zhipu@glm-4-flash", // 该提示词特定的模型配置，可能为 null
    "updated_at": "..."
  },
  ...
]
```

### 2.6 获取/修改/删除提示词文件

#### 2.6.1 获取提示词文件
- **URL**: `GET /prompts/scenarios/{scenario_id}/files/{filename}`
- **参数**:
  - `scenario_id`: 场景的 UUID
  - `filename`: 提示词文件名 (e.g., "00_analyze_input.md")
- **响应示例**:
```json
{
  "id": "uuid-...",
  "name": "00_analyze_input.md",
  "content": "Your prompt content here...",
  "model": "openrouter@anthropic/claude-3-opus", // 如果该文件配置了特定模型
  "order_index": 0,
  "updated_at": "2023-10-27T10:00:00"
}
```

#### 2.6.2 创建/修改提示词文件 (PUT)
- **URL**: `PUT /prompts/scenarios/{scenario_id}/files/{filename}`
- **功能**: 如果文件不存在则创建，存在则更新。此接口为主要的保存接口。
- **Request Body 字段**:
  - `name`: (string) 文件名，需与 URL 中的 filename 一致（或用于重命名）。
  - `content`: (string) 提示词的文本内容 (支持 Jinja2 模板语法)。
  - `model`: (string, optional) 为该提示词指定特定模型 (格式: `channel@model`)。如果不指定或为 null，将使用场景默认模型。
- **请求示例**:
```json
{
  "name": "00_analyze_input.md", 
  "content": "请分析以下输入：{{ user_input }}...",
  "model": "openrouter@google/gemini-pro-1.5"
}
```
- **Response**:
```json
{
  "message": "File updated" // or "File created"
}
```

#### 2.6.3 显式创建提示词文件 (POST)
- **URL**: `POST /prompts/scenarios/{scenario_id}/files`
- **功能**: 显式创建新文件，如果文件名冲突会报错。
- **Request Body**:
```json
{
  "name": "new_prompt.md",
  "content": "New prompt content...",
  "model": "zhipu@glm-4-air" // (Optional)
}
```
- **Response**:
```json
{
  "id": "uuid-...",
  "name": "new_prompt.md",
  ...
}
```

#### 2.6.4 删除提示词文件
- **URL**: `DELETE /prompts/scenarios/{scenario_id}/files/{filename}`
- **说明**: 物理删除该提示词记录。
- **Response**:
```json
{
  "message": "File 00_analyze_input.md deleted"
}
```

---

## 3. 任务管理 (Task Management)

### 3.1 创建任务
- **URL**: `POST /tasks`
- **Content-Type**: `application/json`
- **响应**: `application/json`

**功能说明**:
启动一个新的智能生成任务。后端会根据指定的 `scenario`（场景ID或名称）初始化所有必要的阶段（Phases），并将任务状态置为 `pending`。

**请求参数**:
```json
{
  "user_input": "关于新能源汽车的分析",
  "scenario": "default" // 可传场景名称或 UUID
}
```

**响应示例**:
```json
{
  "id": "task_12345...",
  "scenario_name": "default",
  "session_id": "sess_abcde...",
  "status": "pending",
  "input_text": "关于新能源汽车的分析",
  "created_at": "2023-10-27T10:00:00",
  "result": {
    "phases": {
      "00_analyze_input": {
        "status": "pending",
        "content": null
      },
      // ... 其他阶段根据 scenario 自动加载
    }
  }
}
```

### 3.2 获取任务列表
- **URL**: `GET /tasks`
- **响应**: `application/json`

### 3.3 获取任务详情
- **URL**: `GET /tasks/{task_id}`
- **响应**: `application/json`

### 3.4 获取会话历史 (Session History)
- **URL**: `GET /sessions/{session_id}/history`
- **响应**: `application/json`

---

## 4. 队列与系统状态 (System Status)

### 4.1 获取队列状态
- **URL**: `GET /queue/status`
- **响应**: `application/json`

---

## 5. PDF 生成 (PDF Generation)

### 5.1 生成 PDF
- **URL**: `POST /generate/pdf`
- **Content-Type**: `application/json`
- **响应**: `application/pdf` (文件下载)

**请求参数**:
```json
{
  "html_content": "<html><body><h1>Test</h1></body></html>",
  "filename": "report.pdf" // (可选) 指定下载文件名
}
```

# StratifyAI API Documentation

## 1. 概述
StratifyAI 服务提供智能体场景管理、提示词管理、任务执行以及 LLM 网关功能。

## 6. OpenAI 兼容网关 (OpenAI Compatible Gateway)

提供标准 OpenAI 格式的接口，允许前端直接调用各类模型（OpenRouter, Zhipu, Gemini, SiliconFlow 等），同时隐藏真实 API Key。

**Base URL**: `/stratifyai/v1`

### 6.1 Chat Completions
- **URL**: `POST /stratifyai/v1/chat/completions`
- **功能**: 执行对话生成，完全兼容 OpenAI Chat Completion API 格式。支持流式输出 (Stream) 和非流式输出。
- **Headers**:
  - `Authorization`: `Bearer <user_token>` (使用平台用户 Token)
  - `Content-Type`: `application/json`
  - `X-Session-ID`: `<session_uuid>` (**可选**: 用于关联任务和计费统计，若不传则无法更新任务消耗)
  - `X-App-ID`: `<app_id>` (**新增**: 用于标识调用来源的前端应用ID，如 "chat-web", "mobile-app", "analysis-tool")
- **Request Body**: (Standard OpenAI Format)
```json
{
  "model": "channel@model_id", // 格式: "渠道代码@模型ID", 例如: "openrouter@gpt-4", "zhipu@glm-4-flash"
  "messages": [
    {
        "role": "system", 
        "content": "You are a helpful assistant."
    },
    {
        "role": "user", 
        "content": "Hello, describe this image.",
        // 支持多模态输入 (如果模型支持)
        "content": [ 
            {"type": "text", "text": "Describe this image"},
            {
                "type": "image_url", 
                "image_url": {
                    "url": "https://example.com/image.jpg" 
                }
            }
        ]
    }
  ],
  "stream": true,       // 是否开启流式传输 (SSE)
  "enable_billing": true, // (可选) 是否计费。默认为 true。若为 false，则不扣费也不记录 usage 统计。
  "temperature": 0.7,   // 温度系数 (0-2)
  "top_p": 1.0,         // 核采样
  "max_tokens": 2000,   // 最大输出 Token 数
  "presence_penalty": 0,
  "frequency_penalty": 0
}
```
- **文件与图片上传说明**:
  1. **图片上传**: 
     - 方式一 (推荐): 直接在 `messages` 中使用 OpenAI 格式的 `image_url`。支持公网 URL。
     - 方式二: 如果是本地文件，请先调用 `/stratifyai/files` 接口上传文件，获取返回的 `url` (相对路径或完整路径)，然后将其作为 `image_url` 传入。
  2. **文档/文件上传**: 
     - 目前主要通过提取文本内容后放入 `content` 字段传递给 LLM。
     - 若需要 RAG (检索增强生成) 或文件解析，请先使用文件上传接口，并在业务逻辑层处理文件内容解析。
     - 本接口 (`/chat/completions`) 为纯 LLM 网关，不包含自动文档解析逻辑，仅透传 Message 给模型。
     - Gemini 网页版 (Cookie) 支持直接粘贴图片/文件 URL，后端会自动处理。

- **Supported Channels**:
  - `openrouter`: OpenRouter.ai (聚合)
  - `zhipu`: Zhipu AI (GLM系列)
  - `gemini_api`: Google Gemini API
  - `gemini_cookie`: Google Gemini Web (Cookie based)
  - `siliconflow`: SiliconFlow
  - (以及自定义配置的渠道)

## 7. LLM 渠道管理 (LLM Channels)

提供对模型渠道的动态增删改查。后端优先使用数据库配置，缺省时使用环境变量。

**Base URL**: `/stratifyai/channels`

### 7.1 获取渠道列表
- **URL**: `GET /stratifyai/channels/`
- **Response**:
```json
[
  {
    "channel_code": "openrouter",
    "name": "OpenRouter",
    "base_url": "https://openrouter.ai/api/v1",
    "api_key": "sk-key1,sk-key2",
    "models": "gpt-4,claude-3-opus",
    "is_active": true,
    "config": {},
    "id": 1
  }
]
```

### 7.2 创建/更新渠道
- **URL**: `POST /stratifyai/channels/` 或 `PUT /stratifyai/channels/{id}`
- **Request**:
```json
{
  "channel_code": "my_channel",
  "name": "My Channel",
  "base_url": "...",
  "api_key": "sk-key1,sk-key2", // 支持单个密钥，或使用逗号分隔的多个密钥（将进行轮询负载均衡）
  "models": "model1,model2"
}
```

## 8. 模型定价管理 (LLM Pricing)

管理各渠道模型的定价策略。

**Base URL**: `/stratifyai/pricing`

### 8.1 获取模型定价列表
- **URL**: `GET /stratifyai/pricing`
- **Response**:
```json
[
  {
    "id": "uuid...",
    "channel_code": "openrouter",
    "model": "gpt-4",
    "input_price": 60.0,
    "output_price": 120.0,
    "multiplier": 1.0,
    "is_active": true
  }
]
```

### 8.2 创建模型定价
- **URL**: `POST /stratifyai/pricing`
- **Request**:
```json
{
  "channel_code": "openrouter",
  "model": "gpt-4",
  "input_price": 60.0,
  "output_price": 120.0,
  "multiplier": 1.0
}
```

### 8.3 更新模型定价
- **URL**: `PUT /stratifyai/pricing/{id}`

### 8.4 删除模型定价
- **URL**: `DELETE /stratifyai/pricing/{id}`

## 9. 计费逻辑说明 (Billing Logic)

StratifyAI 网关集成了实时计费功能，但**定价策略与计费结算由 User Service 统一管理**。

### 8.1 计费流程
- **余额检查**: 用户调用 `/chat/completions` 前会检查余额。**余额必须大于 0 才能发起调用** (哪怕仅剩 0.01 CNY)。
- **扣费**: 每次对话结束后（流式传输结束时），网关会将消耗的 Token 数量上报给 User Service。
- **透支**: 允许单次调用导致余额变负（例如余额 1 元，调用消耗 2 元，最终余额 -1 元）。余额为负时将无法发起新的调用，直至充值。
- **计算**: User Service 根据配置的 `UserModelPricing` (模型单价及倍率) 计算费用并扣除余额。
  - `UserModelPricing` 表已拆分为 `channel` 和 `model` 两个字段，支持不同渠道同一模型不同定价。
- **应用追踪**: 通过 Header 中的 `X-App-ID` 字段，可以在 User Service 的账单中区分不同前端应用的消耗。
- **定价管理**: 请参考 `User Service API` 文档中的定价管理部分。

## 9. 提示词管理 (Prompt Management)

提供提示词的增删改查。支持为每个提示词单独配置默认的模型渠道和模型名称。

**Base URL**: `/stratifyai/prompts`

### 8.1 创建提示词
- **URL**: `POST /stratifyai/prompts`
- **Request**:
```json
{
  "name": "analysis_prompt_v1",  // 提示词名称
  "scenario_id": "uuid-of-scenario", // (可选) 关联的场景ID
  "description": "用于分析新能源汽车技术路线", // 描述
  "content": "你是一个分析师... 请分析 {{ content }}", // 提示词内容 (支持 Jinja2 模版语法)
  "channel_code": "zhipu",       // (可选) 指定该提示词默认使用的渠道
  "model_id": "glm-4-flash"      // (可选) 指定该提示词默认使用的模型ID
}
```
- **字段说明**:
  - `name`: 提示词唯一标识名称 (在场景内建议唯一)。
  - `scenario_id`: 关联的场景 UUID。
  - `content`: 提示词模板内容。
  - `channel_code`: (新增) 该提示词绑定的默认渠道代码 (如 `openrouter`, `zhipu`)。
  - `model_id`: (新增) 该提示词绑定的默认模型ID (如 `gpt-4o`, `glm-4`)。**注意**: 请勿在此字段中包含渠道前缀 (例如不要写 `openrouter@gpt-4`，只需写 `gpt-4`)，前端调用时会自动组合。
- **Response**: `Prompt` 对象

### 10.2 获取提示词列表
- **URL**: `GET /stratifyai/prompts`
- **Query Params**:
  - `scenario_id`: (可选) 按场景筛选，获取该场景下的所有提示词。
- **Response**: `[Prompt, ...]`

### 10.3 更新提示词
- **URL**: `PUT /stratifyai/prompts/{id}`
- **Request Body**: (支持部分更新)
```json
{
  "content": "Updated content...",
  "channel_code": "openrouter",
  "model_id": "gpt-4-turbo"
}
```

### 10.4 删除提示词
- **URL**: `DELETE /stratifyai/prompts/{id}`


## 11. 场景资源 (Scenario Resources)

提供简单的场景元数据存储，供前端组织提示词。

**Base URL**: `/stratifyai/scenarios`

### 11.1 创建场景
- **URL**: `POST /stratifyai/scenarios`
- **Request**:
```json
{
  "title": "技术分析场景",         // 场景显示名称 (中文)
  "description": "用于各类技术文档的深度分析",
  "channel_code": "openrouter",  // (可选) 场景默认渠道 (当提示词未指定时使用)
  "model_id": "gpt-4"            // (可选) 场景默认模型 (当提示词未指定时使用)
}
```
- **字段说明**:
  - `title`: 前端展示的标题。
  - `channel_code` & `model_id`: 场景级别的默认模型配置。**注意**: `model_id` 不应包含渠道前缀。

### 11.2 获取场景列表
- **URL**: `GET /stratifyai/scenarios`

### 11.3 更新场景
- **URL**: `PUT /stratifyai/scenarios/{id}`

### 11.4 删除场景
- **URL**: `DELETE /stratifyai/scenarios/{id}`



## 12. Gemini Cookie 接口 (Gemini Cookie API)

提供基于 Cookie 的 Google Gemini 对话能力 (无需 API Key，使用后端持久化的 Session)。

**Base URL**: `/stratifyai/v1/gemini`

### 12.1 Gemini 对话 (Chat)
- **URL**: `POST /stratifyai/v1/gemini/chat`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Authentication**: User Token (Header: `Authorization: Bearer ...`)
- **Request Body**:
```json
{
  "messages": [
    {"role": "user", "content": "你好，请介绍一下你自己"},
    {"role": "model", "content": "我是 Gemini..."} // 可选的历史对话 (注意: Gemini API 中助手角色通常为 'model')
  ],
  "model": "gemini-2.5-flash", // (可选) 指定模型，默认为后端配置
  "stream": true // (可选) 是否流式返回，默认为 true
}
```
- **Response**: Server-Sent Events (SSE)
  - 格式: `data: {"content": "Chunk text", "reasoning": "Optional reasoning"}\n\n`
  - 结束标志: `data: [DONE]\n\n`

### 12.2 Gemini Cookie 状态检查 (Status Check)
- **URL**: `GET /stratifyai/v1/gemini/status`
- **Method**: `GET`
- **Response**:
```json
{
  "valid": true,
  "message": "Cookies are valid.",
  "error_detail": "Optional detailed error message if invalid"
}
```

## 13. 文件资源服务 (File Resources)

提供简单的文件上传和托管服务，用于多模态对话或临时文件存储。

**Base URL**: `/stratifyai/files`

### 13.1 上传文件
- **URL**: `POST /stratifyai/files`
- **Content-Type**: `multipart/form-data`
- **Request**:
  - `file`: (Binary) 文件内容
- **Response**:
```json
{
  "url": "/stratifyai/files/uuid-filename.jpg",
  "filename": "uuid-filename.jpg"
}
```

### 13.2 获取文件
- **URL**: `GET /stratifyai/files/{filename}`
- **Response**: 文件流 (Binary)


## 14. PDF 生成服务 (PDF Generation Service)

提供HTML转PDF以及批量合并功能。

**Base URL**: `/stratifyai`

### 14.1 单个HTML转PDF
- **接口介绍**: 将单个HTML字符串转换为PDF文件。
- **接口方法**: `POST /generate/pdf`
- **Request Body**:
```json
{
  "html_content": "<html><body><h1>Title</h1><p>Content...</p></body></html>",
  "filename": "output.pdf" // 可选
}
```
- **Response**: 返回二进制PDF文件流。

### 14.2 批量HTML转PDF并合并
- **接口介绍**: 将多个HTML文件转换为独立PDF后合并为一个PDF文件。
- **接口方法**: `POST /v1/pdf/batch`
- **Request Body**:
```json
{
  "html_files": [
    {
      "html": "<html>...Page 1...</html>", 
      "filename": "page1"
    },
    {
      "html": "<html>...Page 2...</html>", 
      "filename": "page2"
    }
  ]
}
```
- **Response**: 返回合并后的二进制PDF文件流。

## 14. 任务会话管理 (Agent Session Management)

提供通用的会话状态管理、自动保存、版本控制（快照）及计费统计功能。

**Base URL**: `/stratifyai/v1`

### 15.1 创建任务会话
- **URL**: `POST /stratifyai/v1/sessions`
- **Request**:
```json
{
  "agent_id": "report-gen",
  "title": "2024新能源汽车报告"
}
```
- **Response**: `AgentSession` 对象

### 15.2 获取任务列表
- **URL**: `GET /stratifyai/v1/sessions`
- **Query Params**:
  - `skip`: 分页跳过数量 (默认 0)
  - `limit`: 每页数量 (默认 20)
  - `agent_id`: (可选) 按应用ID筛选
- **Response**: `[AgentSessionSummary, ...]` (不包含 context_data)

### 14.3 获取任务详情 (恢复现场)
- **URL**: `GET /stratifyai/v1/sessions/{id}`
- **Response**: 完整 `AgentSession` 对象，包含 `context_data`。

### 14.4 更新任务状态 (自动保存)
- **URL**: `PATCH /stratifyai/v1/sessions/{id}`
- **说明**: 支持增量更新字段，采用 Last Write Wins 策略。
- **Request**:
```json
{
  "context_data": { "step1": "done", "outline": [...] },
  "current_stage": "generating_ppt",
  "status": "in_progress"
}
```

### 14.5 删除任务
- **URL**: `DELETE /stratifyai/v1/sessions/{id}`

### 15.6 创建快照 (存档)
- **URL**: `POST /stratifyai/v1/sessions/{id}/snapshots`
- **Request**:
```json
{
  "stage_tag": "outline_confirmed",
  "description": "大纲已确认，准备生成内容"
}
```
- **Response**: `SessionSnapshot` 对象

### 15.7 获取快照列表
- **URL**: `GET /stratifyai/v1/sessions/{id}/snapshots`
- **Response**: `[SessionSnapshot, ...]`

### 15.8 回滚/恢复快照
- **URL**: `POST /stratifyai/v1/sessions/{id}/restore`
- **Request**:
```json
{
  "snapshot_id": "uuid-of-snapshot"
}
```
- **Response**: 恢复后的 `AgentSession` 对象 (context_data 已被覆盖)。

## 15. 统计 (Statistics)

提供用户、Agent、模型的消耗统计数据。

**Base URL**: `/stratifyai/v1`

### 15.1 获取用量统计
- **URL**: `GET /stratifyai/v1/stats/usage`
- **功能**: 获取按用户、Agent ID、模型分组的 Token 消耗和费用统计，支持分页。
- **Query Params**:
  - `user_id`: (可选) 按用户ID筛选
  - `agent_id`: (可选) 按 Agent ID 筛选
  - `start_date`: (可选) 开始时间 (ISO 8601 format)
  - `end_date`: (可选) 结束时间 (ISO 8601 format)
  - `skip`: (可选) 分页跳过数量，默认 0
  - `limit`: (可选) 每页返回数量，默认 20
- **Response**: `[UsageStatsResponse, ...]`
```json
[
  {
    "user_id": "user-uuid",
    "username": "testuser",
    "email": "test@example.com",
    "agent_id": "report-gen",
    "session_id": "session-uuid",
    "session_time": "2024-03-20T10:00:00Z",
    "model": "gpt-4",
    "total_input_tokens": 1500,
    "total_output_tokens": 500,
    "total_cost": 0.5,
    "original_cost": 0.25
  }
]
```

### 16.2 获取总用量汇总
- **URL**: `GET /stratifyai/v1/stats/summary`
- **功能**: 获取符合筛选条件的所有任务的总计消耗统计。
- **Query Params**:
  - `user_id`: (可选) 按用户ID筛选
  - `agent_id`: (可选) 按 Agent ID 筛选
  - `start_date`: (可选) 开始时间
  - `end_date`: (可选) 结束时间
- **Response**: `UsageSummaryResponse`
```json
{
  "total_tokens": 2000,          // 总 Token 数 (Input + Output)
  "total_input_tokens": 1500,    // 总输入 Token
  "total_output_tokens": 500,    // 总输出 Token
  "total_cost": 0.5,             // 总结算费用 (倍率后)
  "total_original_cost": 0.25    // 总原始费用 (倍率前)
}
```

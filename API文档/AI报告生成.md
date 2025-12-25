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
     - 方式二: 如果是本地文件，请先调用 `/stratifyai/common/upload` 接口上传文件，获取返回的 `url` (或本地路径)，然后将其作为 `image_url` 传入。
  2. **文档/文件上传**: 
     - 目前主要通过提取文本内容后放入 `content` 字段传递给 LLM。
     - 若需要 RAG (检索增强生成) 或文件解析，请先使用文件上传接口，并在业务逻辑层处理文件内容解析。
     - 本接口 (`/chat/completions`) 为纯 LLM 网关，不包含自动文档解析逻辑，仅透传 Message 给模型。

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
  "api_key": "sk-...",
  "models": "model1,model2"
}
```

## 8. 提示词管理 (Prompt Management)

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

### 8.2 获取提示词列表
- **URL**: `GET /stratifyai/prompts`
- **Query Params**:
  - `scenario_id`: (可选) 按场景筛选，获取该场景下的所有提示词。
- **Response**: `[Prompt, ...]`

### 8.3 更新提示词
- **URL**: `PUT /stratifyai/prompts/{id}`
- **Request Body**: (支持部分更新)
```json
{
  "content": "Updated content...",
  "channel_code": "openrouter",
  "model_id": "gpt-4-turbo"
}
```

### 8.4 删除提示词
- **URL**: `DELETE /stratifyai/prompts/{id}`


## 9. 场景资源 (Scenario Resources)

提供简单的场景元数据存储，供前端组织提示词。

**Base URL**: `/stratifyai/scenarios`

### 9.1 创建场景
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

### 9.2 获取场景列表
- **URL**: `GET /stratifyai/scenarios`

### 9.3 更新场景
- **URL**: `PUT /stratifyai/scenarios/{id}`

### 9.4 删除场景
- **URL**: `DELETE /stratifyai/scenarios/{id}`


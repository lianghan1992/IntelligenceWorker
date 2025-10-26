# 竞争力看板服务 API 文档

## 目录
1. [**概述**](#1-概述)
2. [**认证**](#2-认证)
3. [**实体管理 (Entity Management)**](#3-实体管理-entity-management)
   - [3.1. 获取实体列表](#31-获取实体列表)
   - [3.2. 创建实体](#32-创建实体)
   - [3.3. 获取实体详情](#33-获取实体详情)
   - [3.4. 更新实体](#34-更新实体)
   - [3.5. 删除实体](#35-删除实体)
4. [**模块管理 (Module Management)**](#4-模块管理-module-management)
   - [4.1. 获取模块列表](#41-获取模块列表)
   - [4.2. 创建模块](#42-创建模块)
5. [**数据查询 (Data Query)**](#5-数据查询-data-query)
   - [5.1. 查询业务数据](#51-查询业务数据)
6. [**回溯任务管理 (Backfill Job Management)**](#6-回溯任务管理-backfill-job-management)
   - [6.1. 获取回溯任务列表](#61-获取回溯任务列表)
   - [6.2. 创建回溯任务](#62-创建回溯任务)
   - [6.3. 启动回溯任务](#63-启动回溯任务)
   - [6.4. 暂停回溯任务](#64-暂停回溯任务)
   - [6.5. 获取回溯任务状态](#65-获取回溯任务状态)
7. [**系统监控 (System Monitoring)**](#7-系统监控-system-monitoring)
   - [7.1. 获取系统状态](#71-获取系统状态)
   - [7.2. 健康检查](#72-健康检查)

## 1. 概述

竞争力看板服务是一个基于AI的汽车行业情报分析平台的核心模块，提供实体管理、模块配置、数据查询和回溯任务管理等功能。

**基础URL:** `http://localhost:7657/competitiveness`

**支持的数据格式:** JSON

## 2. 认证

所有API接口（除健康检查外）都需要JWT Token认证。

**认证方式:** Bearer Token

**请求头示例:**
```
Authorization: Bearer <your_jwt_token>
```

## 3. 实体管理 (Entity Management)

### 3.1. 获取实体列表

获取系统中的实体列表，支持按类型和激活状态过滤，并提供标准分页。

- **路径:** `/entities/`
- **方法:** `GET`

**查询参数**

| 参数 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `entity_type` | string | 否 | 实体类型过滤 |
| `is_active` | boolean | 否 | 激活状态过滤 |
| `page` | integer | 否 | 页码，默认1 |
| `size` | integer | 否 | 每页数量，默认50 |

**cURL请求示例**
```bash
curl -X GET "http://localhost:7657/competitiveness/entities/?entity_type=car_brand&page=1&size=10" \
-H "Authorization: Bearer <your_jwt_token>"
```

**返回示例 (200 OK)**
```json
{
  "items": [
    {
      "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      "name": "特斯拉",
      "entity_type": "car_brand",
      "aliases": ["Tesla", "TESLA"],
      "description": "美国电动汽车制造商",
      "metadata": {
        "country": "美国",
        "founded": "2003"
      },
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "size": 10,
  "pages": 1
}
```

### 3.2. 创建实体

创建新的实体记录。

- **路径:** `/entities`
- **方法:** `POST`

**请求说明**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `name` | string | 是 | 实体名称 |
| `entity_type` | string | 是 | 实体类型 |
| `aliases` | array[string] | 否 | 别名列表 |
| `description` | string | 否 | 实体描述 |
| `metadata` | object | 否 | 元数据 |

**请求示例 (JSON)**
```json
{
  "name": "比亚迪",
  "entity_type": "car_brand",
  "aliases": ["BYD", "Build Your Dreams"],
  "description": "中国新能源汽车制造商",
  "metadata": {
    "country": "中国",
    "founded": "1995",
    "headquarters": "深圳"
  }
}
```

**cURL请求示例**
```bash
curl -X POST http://localhost:7657/competitiveness/entities \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <your_jwt_token>" \
-d '{
  "name": "比亚迪",
  "entity_type": "car_brand",
  "aliases": ["BYD", "Build Your Dreams"],
  "description": "中国新能源汽车制造商",
  "metadata": {
    "country": "中国",
    "founded": "1995"
  }
}'
```

**返回示例 (201 Created)**
```json
{
  "id": "b2c3d4e5-f6g7-8901-2345-678901bcdefg",
  "name": "比亚迪",
  "entity_type": "car_brand",
  "aliases": ["BYD", "Build Your Dreams"],
  "description": "中国新能源汽车制造商",
  "metadata": {
    "country": "中国",
    "founded": "1995",
    "headquarters": "深圳"
  },
  "is_active": true,
  "created_at": "2024-01-16T14:20:00.000Z",
  "updated_at": null
}
```

### 3.3. 获取实体详情

根据ID获取特定实体的详细信息。

- **路径:** `/entities/{entity_id}`
- **方法:** `GET`

**路径参数**

| 参数 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `entity_id` | UUID | 是 | 实体ID |

**cURL请求示例**
```bash
curl -X GET http://localhost:7657/competitiveness/entities/a1b2c3d4-e5f6-7890-1234-567890abcdef \
-H "Authorization: Bearer <your_jwt_token>"
```

**返回示例 (200 OK)**
```json
{
  "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "name": "特斯拉",
  "entity_type": "car_brand",
  "aliases": ["Tesla", "TESLA"],
  "description": "美国电动汽车制造商",
  "metadata": {
    "country": "美国",
    "founded": "2003"
  },
  "is_active": true,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-15T10:30:00.000Z"
}
```

### 3.4. 更新实体

更新现有实体的信息。

- **路径:** `/entities/{entity_id}`
- **方法:** `PUT`

**路径参数**

| 参数 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `entity_id` | UUID | 是 | 实体ID |

**请求说明**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `name` | string | 否 | 实体名称 |
| `aliases` | array[string] | 否 | 别名列表 |
| `description` | string | 否 | 实体描述 |
| `metadata` | object | 否 | 元数据 |
| `is_active` | boolean | 否 | 是否激活 |

**请求示例 (JSON)**
```json
{
  "description": "美国领先的电动汽车和清洁能源公司",
  "metadata": {
    "country": "美国",
    "founded": "2003",
    "ceo": "埃隆·马斯克"
  }
}
```

**cURL请求示例**
```bash
curl -X PUT http://localhost:7657/competitiveness/entities/a1b2c3d4-e5f6-7890-1234-567890abcdef \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <your_jwt_token>" \
-d '{
  "description": "美国领先的电动汽车和清洁能源公司",
  "metadata": {
    "country": "美国",
    "founded": "2003",
    "ceo": "埃隆·马斯克"
  }
}'
```

**返回示例 (200 OK)**
```json
{
  "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "name": "特斯拉",
  "entity_type": "car_brand",
  "aliases": ["Tesla", "TESLA"],
  "description": "美国领先的电动汽车和清洁能源公司",
  "metadata": {
    "country": "美国",
    "founded": "2003",
    "ceo": "埃隆·马斯克"
  },
  "is_active": true,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-16T15:45:00.000Z"
}
```

### 3.5. 删除实体

删除指定的实体。

- **路径:** `/entities/{entity_id}`
- **方法:** `DELETE`

**路径参数**

| 参数 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `entity_id` | UUID | 是 | 实体ID |

**cURL请求示例**
```bash
curl -X DELETE http://localhost:7657/competitiveness/entities/a1b2c3d4-e5f6-7890-1234-567890abcdef \
-H "Authorization: Bearer <your_jwt_token>"
```

**返回示例 (200 OK)**
```json
{
  "message": "实体删除成功"
}
```

## 4. 模块管理 (Module Management)

### 4.1. 获取模块列表

获取系统中的模块列表，支持按激活状态过滤。

- **路径:** `/modules`
- **方法:** `GET`

**查询参数**

| 参数 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `is_active` | boolean | 否 | 激活状态过滤 |
| `limit` | integer | 否 | 返回数量限制，默认20，最大100 |
| `offset` | integer | 否 | 偏移量，默认0 |

**cURL请求示例**
```bash
curl -X GET "http://localhost:7657/competitiveness/modules?is_active=true" \
-H "Authorization: Bearer <your_jwt_token>"
```

**返回示例 (200 OK)**
```json
[
  {
    "id": "c3d4e5f6-g7h8-9012-3456-789012cdefgh",
    "module_key": "technology_forecast",
    "module_name": "技术预测",
    "target_entity_types": ["car_brand", "car_model"],
    "extraction_fields": {
      "technology_name": "string",
      "application_area": "string",
      "maturity_level": "string",
      "impact_assessment": "string"
    },
    "final_data_table": "cdash_data_technology",
    "description": "分析汽车行业新技术发展趋势",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": null
  }
]
```

### 4.2. 创建模块

创建新的分析模块。

- **路径:** `/modules`
- **方法:** `POST`

**请求说明**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `module_key` | string | 是 | 模块键（唯一标识） |
| `module_name` | string | 是 | 模块名称 |
| `target_entity_types` | array[string] | 是 | 目标实体类型列表 |
| `extraction_fields` | object | 是 | 提取字段配置 |
| `final_data_table` | string | 是 | 最终数据表名 |
| `description` | string | 否 | 模块描述 |

**请求示例 (JSON)**
```json
{
  "module_key": "car_tech_innovation",
  "module_name": "汽车技术创新分析",
  "target_entity_types": ["car_brand", "car_model", "technology"],
  "extraction_fields": {
    "innovation_type": "string",
    "technology_category": "string",
    "development_stage": "string",
    "commercial_potential": "string",
    "competitive_advantage": "string"
  },
  "final_data_table": "cdash_data_innovation",
  "description": "分析各车企在新技术方面的创新能力和发展方向"
}
```

**cURL请求示例**
```bash
curl -X POST http://localhost:7657/competitiveness/modules \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <your_jwt_token>" \
-d '{
  "module_key": "car_tech_innovation",
  "module_name": "汽车技术创新分析",
  "target_entity_types": ["car_brand", "car_model", "technology"],
  "extraction_fields": {
    "innovation_type": "string",
    "technology_category": "string",
    "development_stage": "string"
  },
  "final_data_table": "cdash_data_innovation",
  "description": "分析各车企在新技术方面的创新能力"
}'
```

**返回示例 (201 Created)**
```json
{
  "id": "d4e5f6g7-h8i9-0123-4567-890123defghi",
  "module_key": "car_tech_innovation",
  "module_name": "汽车技术创新分析",
  "target_entity_types": ["car_brand", "car_model", "technology"],
  "extraction_fields": {
    "innovation_type": "string",
    "technology_category": "string",
    "development_stage": "string",
    "commercial_potential": "string",
    "competitive_advantage": "string"
  },
  "final_data_table": "cdash_data_innovation",
  "description": "分析各车企在新技术方面的创新能力和发展方向",
  "is_active": true,
  "created_at": "2024-01-16T16:00:00.000Z",
  "updated_at": null
}
```

## 5. 数据查询 (Data Query)

### 5.1. 查询业务数据

根据指定条件查询分析后的业务数据。

- **路径:** `/data/query`
- **方法:** `POST`

**请求说明**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `entity_ids` | array[string] | 否 | 实体ID列表 |
| `entity_types` | array[string] | 否 | 实体类型列表 |
| `data_table` | string | 是 | 数据表名 |
| `date_range` | object | 否 | 日期范围 |
| `filters` | object | 否 | 额外过滤条件 |

**查询参数**

| 参数 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `limit` | integer | 否 | 返回数量限制，默认20，最大100 |
| `offset` | integer | 否 | 偏移量，默认0 |

**请求示例 (JSON)**
```json
{
  "entity_types": ["car_brand"],
  "data_table": "cdash_data_technology",
  "date_range": {
    "start": "2024-01-01T00:00:00.000Z",
    "end": "2024-01-31T23:59:59.000Z"
  },
  "filters": {
    "technology_category": "电池技术"
  }
}
```

**cURL请求示例**
```bash
curl -X POST "http://localhost:7657/competitiveness/data/query?limit=10" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <your_jwt_token>" \
-d '{
  "entity_types": ["car_brand"],
  "data_table": "cdash_data_technology",
  "date_range": {
    "start": "2024-01-01T00:00:00.000Z",
    "end": "2024-01-31T23:59:59.000Z"
  }
}'
```

**返回示例 (200 OK)**
```json
{
  "data": [
    {
      "id": "e5f6g7h8-i9j0-1234-5678-901234efghij",
      "entity_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      "entity_name": "特斯拉",
      "technology_name": "4680电池",
      "application_area": "电动汽车动力系统",
      "maturity_level": "量产阶段",
      "impact_assessment": "显著提升能量密度和成本效益",
      "extracted_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

## 6. 回溯任务管理 (Backfill Job Management)

### 6.1. 获取回溯任务列表

获取系统中的回溯任务列表。

- **路径:** `/backfill/jobs`
- **方法:** `GET`

**查询参数**

| 参数 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `status_filter` | string | 否 | 状态过滤 |
| `limit` | integer | 否 | 返回数量限制，默认20，最大100 |
| `offset` | integer | 否 | 偏移量，默认0 |

**cURL请求示例**
```bash
curl -X GET "http://localhost:7657/competitiveness/backfill/jobs?status_filter=running" \
-H "Authorization: Bearer <your_jwt_token>"
```

### 6.2. 创建回溯任务

创建新的数据回溯任务。

- **路径:** `/backfill/jobs`
- **方法:** `POST`

**请求说明**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `name` | string | 是 | 任务名称 |
| `description` | string | 是 | 任务描述 |
| `start_date` | datetime | 是 | 开始日期 |
| `end_date` | datetime | 是 | 结束日期 |
| `module_ids` | array[string] | 否 | 指定模块ID列表 |
| `entity_ids` | array[string] | 否 | 指定实体ID列表 |
| `priority` | integer | 否 | 任务优先级（1-10），默认5 |

**请求示例 (JSON)**
```json
{
  "name": "2024年1月技术分析回溯",
  "description": "回溯分析2024年1月的汽车技术相关文章",
  "start_date": "2024-01-01T00:00:00.000Z",
  "end_date": "2024-01-31T23:59:59.000Z",
  "priority": 7
}
```

### 6.3. 启动回溯任务

启动指定的回溯任务。

- **路径:** `/backfill/jobs/{job_id}/start`
- **方法:** `POST`

### 6.4. 暂停回溯任务

暂停正在运行的回溯任务。

- **路径:** `/backfill/jobs/{job_id}/pause`
- **方法:** `POST`

### 6.5. 获取回溯任务状态

获取指定回溯任务的详细状态信息。

- **路径:** `/backfill/jobs/{job_id}/status`
- **方法:** `GET`

## 7. 系统监控 (System Monitoring)

### 7.1. 获取系统状态

获取竞争力看板服务的系统状态信息。

- **路径:** `/system/status`
- **方法:** `GET`

**cURL请求示例**
```bash
curl -X GET http://localhost:7657/competitiveness/system/status \
-H "Authorization: Bearer <your_jwt_token>"
```

**返回示例 (200 OK)**
```json
{
  "service_name": "竞争力看板服务",
  "version": "1.0.0",
  "status": "healthy",
  "uptime": "2 days, 14:30:25",
  "database_status": "connected",
  "active_modules": 2,
  "total_entities": 156,
  "processing_queue_size": 0,
  "last_processing_time": "2024-01-16T15:45:00.000Z"
}
```

### 7.2. 健康检查

简单的健康检查接口，无需认证。

- **路径:** `/system/health`
- **方法:** `GET`

**cURL请求示例**
```bash
curl -X GET http://localhost:7657/competitiveness/system/health
```

**返回示例 (200 OK)**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-16T16:00:00.000Z"
}
```

## 错误响应

所有API在出现错误时都会返回标准的错误响应格式：

**错误响应示例 (400 Bad Request)**
```json
{
  "detail": "请求参数无效"
}
```

**错误响应示例 (401 Unauthorized)**
```json
{
  "detail": "未提供有效的认证信息"
}
```

**错误响应示例 (404 Not Found)**
```json
{
  "detail": "请求的资源不存在"
}
```

**错误响应示例 (500 Internal Server Error)**
```json
{
  "detail": "服务器内部错误"
}
```
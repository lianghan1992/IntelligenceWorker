# 文档处理服务 (Document Processing Service) API 文档

提供完整的文档上传、处理、转换和管理功能。支持PDF文档的智能解析、Markdown转换、HTML美化生成等功能。所有接口均以 `/api/document-processing` 为前缀，并需要Bearer Token认证。

## 文档状态说明

文档在处理过程中会经历以下状态：

### 状态定义

| 状态 | 英文名称 | 说明 | 触发条件 |
| :--- | :--- | :--- | :--- |
| 已上传 | `uploaded` | 文档已上传，等待处理 | 文档上传成功后的初始状态 |
| 处理中 | `processing` | 正在进行文档解析和转换 | 开始文档处理时 |
| 已完成 | `completed` | 文档处理完成，可查看结果 | 所有页面处理完成 |
| 失败 | `failed` | 文档处理失败 | 处理过程中发生错误 |

### 状态转换流程
```
uploaded → processing → completed
   ↓           ↓
 failed     failed
```

## 1. 上传文档

上传PDF文档进行智能解析和处理。

-   **路径:** `/api/document-processing/upload`
-   **方法:** `POST`
-   **认证:** 需要Bearer Token
-   **Content-Type:** `multipart/form-data`

**请求说明 (Form Data)**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `file` | file | 是 | PDF文档文件 |

**cURL请求示例**
```bash
curl -X POST http://localhost:7657/api/document-processing/upload \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
-F "file=@/path/to/document.pdf"
```

**返回示例 (200 OK)**

返回新上传文档的基本信息。

```json
{
  "document_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "filename": "a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf",
  "file_size": 1024000,
  "file_format": "pdf",
  "status": "uploaded",
  "message": "文档上传成功，开始处理"
}
```

## 2. 获取文档列表 (分页、筛选、排序)

获取系统中所有文档的列表，支持分页、状态筛选、关键词搜索和排序。

-   **路径:** `/api/document-processing/documents`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**查询参数**

| 参数 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `page` | integer | 1 | 请求的页码 |
| `page_size` | integer | 20 | 每页返回的数量 |
| `status` | string | (无) | 按文档状态筛选 (uploaded, processing, completed, failed) |
| `file_format` | string | (无) | 按文件格式筛选 (pdf, docx, doc, html, markdown, txt) |
| `search` | string | (无) | 模糊搜索关键词 (匹配文件名) |
| `sort_by` | string | `created_at` | 排序字段 (created_at, updated_at, file_size, filename) |
| `sort_order` | string | `desc` | 排序方向 (asc 或 desc) |
| `date_from` | string | (无) | 开始日期 (YYYY-MM-DD) |
| `date_to` | string | (无) | 结束日期 (YYYY-MM-DD) |

**cURL请求示例**
```bash
# 获取第一页，每页10个，状态为completed，并按创建时间降序排序
curl -X GET "http://localhost:7657/api/document-processing/documents?page=1&page_size=10&status=completed&sort_by=created_at&sort_order=desc" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**

返回一个包含分页元数据和当前页文档列表的对象。

```json
{
  "items": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "filename": "a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf",
      "original_filename": "原始文档.pdf",
      "file_size": 1024000,
      "file_format": "pdf",
      "total_pages": 10,
      "processed_pages": 10,
      "status": "completed",
      "error_message": null,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:05:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10
}
```

## 3. 获取文档详情

获取指定文档的详细信息，包括所有页面信息。

-   **路径:** `/api/document-processing/documents/{document_id}`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**路径参数**

| 参数 | 类型 | 说明 |
| :--- | :--- | :--- |
| `document_id` | string | 文档ID |

**cURL请求示例**
```bash
curl -X GET "http://localhost:7657/api/document-processing/documents/a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**

返回指定文档的详细信息，包括所有页面信息。

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "filename": "a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf",
  "original_filename": "原始文档.pdf",
  "file_size": 1024000,
  "file_format": "pdf",
  "total_pages": 10,
  "processed_pages": 10,
  "status": "completed",
  "error_message": null,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:05:00Z",
  "markdown_path": "/path/to/document.md",
  "html_path": "/path/to/document.html",
  "extra_metadata": {},
  "pages": [
    {
      "id": "page-uuid-1",
      "page_number": 1,
      "status": "completed",
      "error_message": null,
      "processing_time": 2.5,
      "created_at": "2024-01-01T00:01:00Z",
      "updated_at": "2024-01-01T00:03:30Z"
    }
  ]
}
```

## 4. 删除文档

删除指定文档及其相关文件。

-   **路径:** `/api/document-processing/documents/{document_id}`
-   **方法:** `DELETE`
-   **认证:** 需要Bearer Token

**路径参数**

| 参数 | 类型 | 说明 |
| :--- | :--- | :--- |
| `document_id` | string | 文档ID |

**cURL请求示例**
```bash
curl -X DELETE "http://localhost:7657/api/document-processing/documents/a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**

返回删除操作的结果。

```json
{
  "message": "文档删除成功",
  "document_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

## 5. 获取文档内容

获取文档的Markdown格式内容。

-   **路径:** `/api/document-processing/documents/{document_id}/content`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**路径参数**

| 参数 | 类型 | 说明 |
| :--- | :--- | :--- |
| `document_id` | string | 文档ID |

**查询参数**

| 参数 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `format` | string | `markdown` | 返回格式 (markdown, html) |

**cURL请求示例**
```bash
curl -X GET "http://localhost:7657/api/document-processing/documents/{document_id}/content?format=markdown" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**

返回文档内容。

```json
{
  "document_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "format": "markdown",
  "content": "# 文档标题\n\n文档内容...",
  "message": "获取文档内容成功"
}
```

## 6. 获取文档统计信息

获取文档的多维度统计信息，包括按状态、格式、日期的分布统计。

-   **路径:** `/api/document-processing/documents/statistics`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**查询参数**

| 参数 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `date_from` | string | (无) | 统计开始日期 (YYYY-MM-DD) |
| `date_to` | string | (无) | 统计结束日期 (YYYY-MM-DD) |

**cURL请求示例**
```bash
curl -X GET "http://localhost:7657/api/document-processing/documents/statistics?date_from=2024-01-01&date_to=2024-01-31" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**

返回文档的多维度统计信息。

```json
{
  "total_documents": 150,
  "by_status": {
    "completed": 120,
    "processing": 20,
    "uploaded": 5,
    "failed": 5
  },
  "by_format": {
    "pdf": 140,
    "docx": 8,
    "doc": 2
  },
  "by_date": {
    "2024-01-01": 5,
    "2024-01-02": 8,
    "2024-01-03": 12
  },
  "total_size": 1073741824,
  "avg_processing_time": 45.2
}
```

## 7. HTML 生成与管理

### 生成HTML文件

为指定文档生成HTML格式的美化报告。

-   **路径:** `/api/document-processing/documents/{document_id}/generate-html`
-   **方法:** `POST`
-   **认证:** 需要Bearer Token

**路径参数**

| 参数 | 类型 | 说明 |
| :--- | :--- | :--- |
| `document_id` | string | 文档ID |

**cURL请求示例**
```bash
curl -X POST "http://localhost:7657/api/document-processing/documents/a1b2c3d4-e5f6-7890-abcd-ef1234567890/generate-html" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**

返回HTML文件生成结果。

```json
{
  "document_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "html_path": "/path/to/generated.html",
  "message": "HTML文件生成成功"
}
```

### 重新生成HTML

重新生成HTML文件，可选择删除旧文件和指定模板样式。

-   **路径:** `/api/document-processing/documents/{document_id}/regenerate-html`
-   **方法:** `POST`
-   **认证:** 需要Bearer Token
-   **Content-Type:** `application/json`

**路径参数**

| 参数 | 类型 | 说明 |
| :--- | :--- | :--- |
| `document_id` | string | 文档ID |

**请求参数 (JSON Body)**

| 字段 | 类型 | 是否必须 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| `delete_old` | boolean | 否 | true | 是否删除旧文件 |
| `template_style` | string | 否 | null | 模板样式 |

**cURL请求示例**
```bash
curl -X POST "http://localhost:7657/api/document-processing/documents/a1b2c3d4-e5f6-7890-abcd-ef1234567890/regenerate-html" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "delete_old": true,
  "template_style": "default"
}'
```

**返回示例 (200 OK)**

返回HTML文件重新生成结果。

```json
{
  "document_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "html_path": "/path/to/new_generated.html",
  "old_html_deleted": true,
  "message": "HTML文件重新生成成功"
}
```

### 下载HTML文件

下载生成的HTML文件。

-   **路径:** `/api/document-processing/documents/{document_id}/html`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**路径参数**

| 参数 | 类型 | 说明 |
| :--- | :--- | :--- |
| `document_id` | string | 文档ID |

**cURL请求示例**
```bash
curl -X GET "http://localhost:7657/api/document-processing/documents/a1b2c3d4-e5f6-7890-abcd-ef1234567890/html" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
-o "document.html"
```

**返回示例 (200 OK)**

返回HTML文件流 (application/octet-stream)

### 预览HTML效果

生成HTML预览，不保存文件。

-   **路径:** `/api/document-processing/documents/{document_id}/preview-html`
-   **方法:** `POST`
-   **认证:** 需要Bearer Token

**路径参数**

| 参数 | 类型 | 说明 |
| :--- | :--- | :--- |
| `document_id` | string | 文档ID |

**查询参数**

| 参数 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `template_style` | string | (无) | 模板样式 |

**cURL请求示例**
```bash
curl -X POST "http://localhost:7657/api/document-processing/documents/a1b2c3d4-e5f6-7890-abcd-ef1234567890/preview-html?template_style=default" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**

返回HTML预览内容。

```json
{
  "document_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "template_style": "default",
  "html_content": "<html>...</html>",
  "message": "HTML预览生成成功"
}
```

## 8. 模板管理

### 获取模板列表

获取可用的HTML模板列表。

-   **路径:** `/api/document-processing/templates`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**cURL请求示例**
```bash
curl -X GET "http://localhost:7657/api/document-processing/templates" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**

返回可用模板列表。

```json
{
  "templates": [
    {
      "name": "default",
      "description": "默认模板 - 使用Tailwind CSS和Flowbite组件",
      "is_default": true
    },
    {
      "name": "minimal",
      "description": "简约模板 - 简洁的黑白设计",
      "is_default": false
    }
  ],
  "total": 4
}
```

## 9. 批量操作

### 批量操作文档

对多个文档执行批量操作。

-   **路径:** `/api/document-processing/batch-operations`
-   **方法:** `POST`
-   **认证:** 需要Bearer Token
-   **Content-Type:** `application/json`

**请求参数 (JSON Body)**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `document_ids` | array | 是 | 文档ID列表 |
| `operation` | string | 是 | 操作类型 |

**支持的操作类型**
- `generate_html`: 批量生成HTML
- `regenerate_html`: 批量重新生成HTML
- `delete`: 批量删除 (开发中)

**cURL请求示例**
```bash
curl -X POST "http://localhost:7657/api/document-processing/batch-operations" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "document_ids": ["a1b2c3d4-e5f6-7890-abcd-ef1234567890", "b2c3d4e5-f6g7-8901-bcde-f23456789012"],
  "operation": "generate_html"
}'
```

**返回示例 (200 OK)**

返回批量操作结果。

```json
{
  "success_count": 2,
  "failed_count": 1,
  "success_ids": ["a1b2c3d4-e5f6-7890-abcd-ef1234567890", "b2c3d4e5-f6g7-8901-bcde-f23456789012"],
  "failed_ids": ["c3d4e5f6-g7h8-9012-cdef-345678901234"],
  "errors": {
    "c3d4e5f6-g7h8-9012-cdef-345678901234": "文档不存在或Markdown文件缺失"
  }
}
```

## 10. 导出功能

### 创建导出任务

创建文档页面导出任务。

-   **路径:** `/api/document-processing/documents/{document_id}/export`
-   **方法:** `POST`
-   **认证:** 需要Bearer Token
-   **Content-Type:** `application/json`

**路径参数**

| 参数 | 类型 | 说明 |
| :--- | :--- | :--- |
| `document_id` | string | 文档ID |

**请求参数 (JSON Body)**

| 字段 | 类型 | 是否必须 | 说明 |
| :--- | :--- | :--- | :--- |
| `export_type` | string | 是 | 导出类型 (pdf) |
| `page_number` | integer | 是 | 页码 |

**cURL请求示例**
```bash
curl -X POST "http://localhost:7657/api/document-processing/documents/a1b2c3d4-e5f6-7890-abcd-ef1234567890/export" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "export_type": "pdf",
  "page_number": 1
}'
```

**返回示例 (200 OK)**

返回导出任务创建结果。

```json
{
  "task_id": "t1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "document_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "export_type": "pdf",
  "page_number": 1,
  "status": "pending",
  "message": "导出任务创建成功"
}
```

### 获取导出任务状态

获取导出任务的状态和进度。

-   **路径:** `/api/document-processing/export-tasks/{task_id}`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**路径参数**

| 参数 | 类型 | 说明 |
| :--- | :--- | :--- |
| `task_id` | string | 任务ID |

**cURL请求示例**
```bash
curl -X GET "http://localhost:7657/api/document-processing/export-tasks/t1a2b3c4-d5e6-7890-abcd-ef1234567890" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**

返回导出任务状态信息。

```json
{
  "id": "t1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "document_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "export_type": "pdf",
  "page_number": 1,
  "status": "completed",
  "file_path": "/path/to/exported.pdf",
  "file_size": 102400,
  "processing_time": 5.2,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:05Z"
}
```

### 下载导出文件

下载导出的文件。

-   **路径:** `/api/document-processing/export-tasks/{task_id}/download`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**路径参数**

| 参数 | 类型 | 说明 |
| :--- | :--- | :--- |
| `task_id` | string | 任务ID |

**cURL请求示例**
```bash
curl -X GET "http://localhost:7657/api/document-processing/export-tasks/t1a2b3c4-d5e6-7890-abcd-ef1234567890/download" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
-o "exported_file.pdf"
```

**返回示例 (200 OK)**

返回文件流

### 获取导出历史

获取导出任务历史记录。

-   **路径:** `/api/document-processing/export-history`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**查询参数**

| 参数 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `page` | integer | 1 | 页码 |
| `limit` | integer | 10 | 每页数量 |

**cURL请求示例**
```bash
curl -X GET "http://localhost:7657/api/document-processing/export-history?page=1&limit=10" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**

返回导出历史记录。

```json
{
  "items": [
    {
      "id": "t1a2b3c4-d5e6-7890-abcd-ef1234567890",
      "document_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "export_type": "pdf",
      "page_number": 1,
      "status": "completed",
      "file_path": "/path/to/exported.pdf",
      "file_size": 102400,
      "processing_time": 5.2,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:05Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

## 11. 页面内容

### 获取页面内容

获取文档指定页面的内容。

-   **路径:** `/api/document-processing/documents/{document_id}/pages/{page_number}`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**路径参数**

| 参数 | 类型 | 说明 |
| :--- | :--- | :--- |
| `document_id` | string | 文档ID |
| `page_number` | integer | 页码 |

**cURL请求示例**
```bash
curl -X GET "http://localhost:7657/api/document-processing/documents/a1b2c3d4-e5f6-7890-abcd-ef1234567890/pages/1" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**

返回页面内容信息。

```json
{
  "page_number": 1,
  "content": "页面文本内容...",
  "image_path": "/path/to/page_image.png"
}
```

### 下载Markdown文件

下载文档的Markdown格式文件。

-   **路径:** `/api/document-processing/documents/{document_id}/download-markdown`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**路径参数**

| 参数 | 类型 | 说明 |
| :--- | :--- | :--- |
| `document_id` | string | 文档ID |

**cURL请求示例**
```bash
curl -X GET "http://localhost:7657/api/document-processing/documents/a1b2c3d4-e5f6-7890-abcd-ef1234567890/download-markdown" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
-o "document.md"
```

**返回示例 (200 OK)**

返回Markdown文件流 (text/markdown)

## 12. 系统功能

### 健康检查

检查服务健康状态。

-   **路径:** `/api/document-processing/health`
-   **方法:** `GET`
-   **认证:** 无需认证

**cURL请求示例**
```bash
curl -X GET "http://localhost:7657/api/document-processing/health"
```

**返回示例 (200 OK)**

返回服务健康状态。

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0.0"
}
```

### 获取处理统计

获取文档处理的统计信息。

-   **路径:** `/api/document-processing/processing-stats`
-   **方法:** `GET`
-   **认证:** 需要Bearer Token

**cURL请求示例**
```bash
curl -X GET "http://localhost:7657/api/document-processing/processing-stats" \
-H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**返回示例 (200 OK)**

返回文档处理统计信息。

```json
{
  "total_documents": 150,
  "completed_documents": 120,
  "processing_documents": 20,
  "failed_documents": 10,
  "total_pages": 1500,
  "average_processing_time": 30.5
}
```

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未授权访问 |
| 404 | 资源不存在 |
| 422 | 请求数据验证失败 |
| 500 | 服务器内部错误 |
| 501 | 功能未实现 |

## 状态码说明

### 文档状态 (status)
- `pending`: 等待处理
- `processing`: 处理中
- `completed`: 处理完成
- `failed`: 处理失败

### 导出任务状态 (export_status)
- `pending`: 等待导出
- `processing`: 导出中
- `completed`: 导出完成
- `failed`: 导出失败

## 使用示例

### 完整的文档处理流程

1. **上传文档**
```bash
curl -X POST "http://localhost:7657/api/document-processing/upload" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@document.pdf"
```

2. **查询处理状态**
```bash
curl -X GET "http://localhost:7657/api/document-processing/documents/DOCUMENT_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

3. **生成HTML报告**
```bash
curl -X POST "http://localhost:7657/api/document-processing/documents/DOCUMENT_ID/generate-html" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

4. **下载HTML文件**
```bash
curl -X GET "http://localhost:7657/api/document-processing/documents/DOCUMENT_ID/html" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -o report.html
```

### 批量操作示例

```bash
curl -X POST "http://localhost:7657/api/document-processing/batch-operations" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "document_ids": ["uuid1", "uuid2", "uuid3"],
    "operation": "generate_html"
  }'
```

### 获取统计信息

```bash
curl -X GET "http://localhost:7657/api/document-processing/documents/statistics?date_from=2024-01-01&date_to=2024-01-31" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 注意事项

1. **文件大小限制**: 单个文件最大支持100MB
2. **并发处理**: 系统支持最多10个文档同时处理
3. **文件保存**: 生成的文件会保存在服务器上，建议定期清理
4. **认证要求**: 所有API都需要有效的Bearer Token
5. **速率限制**: 每个用户每分钟最多100次请求

## 更新日志

### v1.0.0 (2024-01-01)
- 初始版本发布
- 支持PDF文档上传和处理
- 支持Markdown和HTML格式转换
- 提供完整的API接口
- 支持批量操作和统计功能
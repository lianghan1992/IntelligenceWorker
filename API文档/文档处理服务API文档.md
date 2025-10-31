# 文档处理服务 API 文档

## 概述

文档处理服务提供了完整的文档上传、处理、转换和管理功能。支持PDF文档的智能解析、Markdown转换、HTML美化生成等功能。

## 基础信息

- **服务名称**: Document Processing Service
- **基础URL**: `/documents`
- **版本**: v1.0
- **认证方式**: Bearer Token

## API 接口列表

### 1. 文档管理

#### 1.1 上传文档
- **接口**: `POST /upload`
- **描述**: 上传PDF文档进行处理
- **请求参数**:
  - `file`: 文件对象 (multipart/form-data)
- **响应示例**:
```json
{
  "document_id": "uuid",
  "filename": "document.pdf",
  "message": "文档上传成功，开始处理"
}
```

#### 1.2 获取文档列表（增强版）
- **接口**: `GET /documents`
- **描述**: 获取文档列表，支持分页、筛选、排序和搜索
- **查询参数**:
  - `page`: 页码 (默认: 1)
  - `page_size`: 每页数量 (默认: 10, 最大: 100)
  - `status`: 文档状态筛选 (pending/processing/completed/failed)
  - `file_format`: 文件格式筛选 (pdf/docx/txt等)
  - `search`: 搜索关键词 (搜索文件名)
  - `sort_by`: 排序字段 (created_at/updated_at/file_size等)
  - `sort_order`: 排序方向 (asc/desc)
  - `date_from`: 开始日期 (YYYY-MM-DD)
  - `date_to`: 结束日期 (YYYY-MM-DD)
- **响应示例**:
```json
{
  "documents": [
    {
      "id": "uuid",
      "filename": "document.pdf",
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
  "page_size": 10,
  "total_pages": 10
}
```

#### 1.3 获取文档详情
- **接口**: `GET /documents/{document_id}`
- **描述**: 获取指定文档的详细信息
- **路径参数**:
  - `document_id`: 文档ID
- **响应示例**:
```json
{
  "id": "uuid",
  "filename": "document.pdf",
  "original_filename": "原始文档.pdf",
  "file_size": 1024000,
  "file_format": "pdf",
  "total_pages": 10,
  "processed_pages": 10,
  "status": "completed",
  "error_message": null,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:05:00Z",
  "pages": [
    {
      "page_number": 1,
      "content": "页面内容...",
      "image_path": "/path/to/image.png"
    }
  ]
}
```

#### 1.4 删除文档
- **接口**: `DELETE /documents/{document_id}`
- **描述**: 删除指定文档及其相关文件
- **路径参数**:
  - `document_id`: 文档ID
- **响应示例**:
```json
{
  "detail": "删除功能正在开发中"
}
```

### 2. 文档统计

#### 2.1 获取文档统计信息
- **接口**: `GET /documents/statistics`
- **描述**: 获取文档的多维度统计信息
- **查询参数**:
  - `date_from`: 统计开始日期 (可选)
  - `date_to`: 统计结束日期 (可选)
- **响应示例**:
```json
{
  "total_documents": 150,
  "by_status": {
    "completed": 120,
    "processing": 20,
    "failed": 10
  },
  "by_format": {
    "pdf": 140,
    "docx": 10
  },
  "by_date": {
    "2024-01-01": 5,
    "2024-01-02": 8,
    "2024-01-03": 12
  },
  "total_size": 1073741824
}
```

### 3. HTML 生成与管理

#### 3.1 生成HTML文件
- **接口**: `POST /documents/{document_id}/generate-html`
- **描述**: 为指定文档生成HTML格式的美化报告
- **路径参数**:
  - `document_id`: 文档ID
- **响应示例**:
```json
{
  "document_id": "uuid",
  "html_path": "/path/to/generated.html",
  "message": "HTML文件生成成功"
}
```

#### 3.2 重新生成HTML
- **接口**: `POST /documents/{document_id}/regenerate-html`
- **描述**: 重新生成HTML文件，可选择删除旧文件
- **路径参数**:
  - `document_id`: 文档ID
- **请求体**:
```json
{
  "delete_old": true,
  "template_style": "default"
}
```
- **响应示例**:
```json
{
  "document_id": "uuid",
  "html_path": "/path/to/new_generated.html",
  "old_html_deleted": true,
  "message": "HTML文件重新生成成功"
}
```

#### 3.3 下载HTML文件
- **接口**: `GET /documents/{document_id}/download-html`
- **描述**: 下载生成的HTML文件
- **路径参数**:
  - `document_id`: 文档ID
- **响应**: 文件流 (application/octet-stream)

#### 3.4 预览HTML效果
- **接口**: `POST /documents/{document_id}/preview-html`
- **描述**: 生成HTML预览，不保存文件
- **路径参数**:
  - `document_id`: 文档ID
- **查询参数**:
  - `template_style`: 模板样式 (可选)
- **响应示例**:
```json
{
  "document_id": "uuid",
  "template_style": "default",
  "html_content": "<html>...</html>",
  "message": "HTML预览生成成功"
}
```

### 4. 模板管理

#### 4.1 获取模板列表
- **接口**: `GET /documents/templates`
- **描述**: 获取可用的HTML模板列表
- **响应示例**:
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

### 5. 批量操作

#### 5.1 批量操作文档
- **接口**: `POST /documents/batch-operations`
- **描述**: 对多个文档执行批量操作
- **请求体**:
```json
{
  "document_ids": ["uuid1", "uuid2", "uuid3"],
  "operation": "generate_html"
}
```
- **支持的操作类型**:
  - `generate_html`: 批量生成HTML
  - `regenerate_html`: 批量重新生成HTML
  - `delete`: 批量删除 (开发中)
- **响应示例**:
```json
{
  "success_count": 2,
  "failed_count": 1,
  "success_ids": ["uuid1", "uuid2"],
  "failed_ids": ["uuid3"],
  "errors": {
    "uuid3": "文档不存在或Markdown文件缺失"
  }
}
```

### 6. 导出功能

#### 6.1 创建导出任务
- **接口**: `POST /documents/{document_id}/export`
- **描述**: 创建文档页面导出任务
- **路径参数**:
  - `document_id`: 文档ID
- **查询参数**:
  - `page_number`: 页码 (可选，如果未指定，则导出所有页面)
- **请求体**:
```json
{
  "export_type": "pdf"
}
```
- **响应示例**:
```json
{
  "task_id": "uuid",
  "document_id": "uuid",
  "export_type": "pdf",
  "page_number": 1,
  "status": "pending",
  "message": "导出任务创建成功"
}
```

#### 6.2 获取导出任务状态
- **接口**: `GET /export-tasks/{task_id}`
- **描述**: 获取导出任务的状态和进度
- **路径参数**:
  - `task_id`: 任务ID
- **响应示例**:
```json
{
  "id": "uuid",
  "document_id": "uuid",
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

#### 6.3 下载导出文件
- **接口**: `GET /export-tasks/{task_id}/download`
- **描述**: 下载导出的文件
- **路径参数**:
  - `task_id`: 任务ID
- **响应**: 文件流

#### 6.4 获取导出历史
- **接口**: `GET /documents/export-history`
- **描述**: 获取导出任务历史记录
- **查询参数**:
  - `page`: 页码 (默认: 1)
  - `page_size`: 每页数量 (默认: 10)
- **响应示例**:
```json
{
  "tasks": [
    {
      "id": "uuid",
      "document_id": "uuid",
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
  "page_size": 10,
  "total_pages": 5
}
```

### 7. 页面内容

#### 7.1 获取页面内容
- **接口**: `GET /documents/{document_id}/pages/{page_number}`
- **描述**: 获取文档指定页面的内容
- **路径参数**:
  - `document_id`: 文档ID
  - `page_number`: 页码
- **响应示例**:
```json
{
  "page_number": 1,
  "content": "页面文本内容...",
  "image_path": "/path/to/page_image.png"
}
```

#### 7.2 下载Markdown文件
- **接口**: `GET /documents/{document_id}/markdown`
- **描述**: 下载文档的Markdown格式文件
- **路径参数**:
  - `document_id`: 文档ID
- **响应**: 文件流 (text/markdown)

### 8. 系统功能

#### 8.1 健康检查
- **接口**: `GET /health-check`
- **描述**: 检查服务健康状态
- **响应示例**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "1.0.0"
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
curl -X POST "http://localhost:7657/documents/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf"
```

2. **查询处理状态**
```bash
curl -X GET "http://localhost:7657/documents/{document_id}" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. **生成HTML报告**
```bash
curl -X POST "http://localhost:7657/documents/{document_id}/generate-html" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

4. **下载HTML文件**
```bash
curl -X GET "http://localhost:7657/documents/{document_id}/download-html" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o report.html
```

### 批量操作示例

```bash
curl -X POST "http://localhost:7657/documents/batch-operations" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "document_ids": ["uuid1", "uuid2", "uuid3"],
    "operation": "generate_html"
  }'
```

### 获取统计信息

```bash
curl -X GET "http://localhost:7657/documents/statistics?date_from=2024-01-01&date_to=2024-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
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
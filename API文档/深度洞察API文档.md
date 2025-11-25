# 深度洞察服务 最新 API 文档

说明：所有接口前缀为 `/api/deep_insight`，返回均为 JSON；所有端点均需 JWT 鉴权（Bearer Token）。本服务支持「先上传原始 PDF，再创建并启动任务」的分步流程，最终输出单页 HTML 与合稿 PDF，并提供封面图与原始 PDF 下载。

## 认证
- 获取令牌：`POST /api/user/login`
  ```bash
  curl -X POST http://127.0.0.1:7657/api/user/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@intelligenceworker.com","password":"test.0316!"}'
  ```
  响应包含 `accessToken` 字段。
- 使用令牌：在请求头添加 `Authorization: Bearer <accessToken>`

## 接口总览
- 类别管理：
  - 创建类别：`POST /api/deep_insight/categories`
  - 列出类别：`GET /api/deep_insight/categories`
  - 删除类别：`DELETE /api/deep_insight/categories/{cid}`
- 原始文件上传与管理：
  - 批量上传 PDF：`POST /api/deep_insight/uploads`
  - 列出已上传：`GET /api/deep_insight/uploads`
  - 删除上传文件：`DELETE /api/deep_insight/uploads/{file_name}`
- 任务创建与执行：
  - 基于文件名创建任务：`POST /api/deep_insight/tasks`
  - 启动任务处理：`POST /api/deep_insight/tasks/{task_id}/start`
  - 查询任务详情：`GET /api/deep_insight/tasks/{task_id}`
  - 查询任务列表：`GET /api/deep_insight/tasks`
  - 任务统计：`GET /api/deep_insight/tasks/stats`
  - 任务处理状态：`GET /api/deep_insight/tasks/{task_id}/status`
  - 删除任务（uuid 校验版）：`DELETE /api/deep_insight/tasks/{task_id}`（支持两种路由形式）
- 页面与文件下载：
  - 下载原始 PDF：`GET /api/deep_insight/tasks/{task_id}/original`
  - 下载合稿 PDF：`GET /api/deep_insight/tasks/{task_id}/bundle`
  - 下载封面图：`GET /api/deep_insight/tasks/{task_id}/cover`
  - 列出页面：`GET /api/deep_insight/tasks/{task_id}/pages`
  - 下载单页 PDF：`GET /api/deep_insight/tasks/{task_id}/pages/{page_index}/pdf`
- Gemini Cookie 管理：
  - 更新 Cookie：`POST /api/deep_insight/gemini/cookies`
  - 检查 Cookie 状态：`GET /api/deep_insight/gemini/cookies/check`

---

## 类别管理
- 创建类别：`POST /api/deep_insight/categories`
  - 表单字段：
    - `name`：字符串，必填
    - `parent_id`：字符串，可选
  - cURL：
    ```bash
    curl -X POST http://127.0.0.1:7657/api/deep_insight/categories \
      -H "Authorization: Bearer <token>" \
      -F "name=智驾芯片" -F "parent_id="
    ```

- 列出类别：`GET /api/deep_insight/categories`
  ```bash
  curl -X GET http://127.0.0.1:7657/api/deep_insight/categories \
    -H "Authorization: Bearer <token>"
  ```

- 删除类别：`DELETE /api/deep_insight/categories/{cid}`
  ```bash
  curl -X DELETE http://127.0.0.1:7657/api/deep_insight/categories/<cid> \
    -H "Authorization: Bearer <token>"
  ```

---

## 原始文件上传与管理
- 批量上传 PDF：`POST /api/deep_insight/uploads`
  - 表单：`files[]`（多个 `UploadFile`）
  - 说明：仅保存文件到上传目录，不立即处理。
  - cURL：
    ```bash
    curl -X POST http://127.0.0.1:7657/api/deep_insight/uploads \
      -H "Authorization: Bearer <token>" \
      -F 'files=@/path/to/report1.pdf' \
      -F 'files=@/path/to/report2.pdf'
    ```

- 列出已上传：`GET /api/deep_insight/uploads`
  ```bash
  curl -X GET http://127.0.0.1:7657/api/deep_insight/uploads \
    -H "Authorization: Bearer <token>"
  ```

- 删除上传文件：`DELETE /api/deep_insight/uploads/{file_name}`
  ```bash
  curl -X DELETE http://127.0.0.1:7657/api/deep_insight/uploads/<file_name> \
    -H "Authorization: Bearer <token>"
  ```

---

## 任务创建与执行
- 创建任务：`POST /api/deep_insight/tasks`
  - 表单字段：
    - `file_name`：字符串，必填，指向已上传目录中的 PDF 文件名
    - `category_id`：字符串，可选
  - 行为：将原始 PDF 复制到任务目录并记录 `original_pdf_path`，任务状态初始为 `pending`。
  - cURL：
    ```bash
    curl -X POST http://127.0.0.1:7657/api/deep_insight/tasks \
      -H "Authorization: Bearer <token>" \
      -F "file_name=report1.pdf" -F "category_id="
    ```

- 启动任务处理：`POST /api/deep_insight/tasks/{task_id}/start`
  - 行为：触发异步处理（切图→视觉识别→Markdown→HTML+PDF）。
  - cURL：
    ```bash
    curl -X POST http://127.0.0.1:7657/api/deep_insight/tasks/<task_id>/start \
      -H "Authorization: Bearer <token>"
    ```

- 查询任务详情：`GET /api/deep_insight/tasks/{task_id}`
  - 返回字段：`id, file_name, file_type, status, total_pages, processed_pages, result_bundle_pdf, cover_image_path, created_at, updated_at`

- 查询任务列表：`GET /api/deep_insight/tasks?page=1&limit=20`

- 任务处理状态：`GET /api/deep_insight/tasks/{task_id}/status`
  - 返回字段：`status, total_pages, processed_pages, last_processed_page, result_bundle_pdf`

- 任务统计：`GET /api/deep_insight/tasks/stats`
  - 返回字段：`total, completed, failed, processing, pending`

- 删除任务：`DELETE /api/deep_insight/tasks/{task_id}`
  - 行为：删除任务目录与数据库记录；若记录不存在则幂等返回 `already deleted`。

---

## 页面与文件下载
- 下载原始 PDF：`GET /api/deep_insight/tasks/{task_id}/original`
- 下载合稿 PDF：`GET /api/deep_insight/tasks/{task_id}/bundle`
- 下载封面图：`GET /api/deep_insight/tasks/{task_id}/cover`
- 列出页面：`GET /api/deep_insight/tasks/{task_id}/pages?page=1&limit=20`
  - 每项字段：`id, page_index, image_path, html_path, pdf_path, status, created_at, updated_at`
- 下载单页 PDF：`GET /api/deep_insight/tasks/{task_id}/pages/{page_index}/pdf`

---

## Gemini Cookie 管理
- 更新 Cookie：`POST /api/deep_insight/gemini/cookies`
  - 表单字段：`secure_1psid`, `secure_1psidts`, `http_proxy`（可选）
- 检查 Cookie 状态：`GET /api/deep_insight/gemini/cookies/check`

---

## 工作流与产出
- 上传阶段：通过 `/uploads` 保存原始 PDF 到上传目录（不处理）。
- 任务阶段：`POST /tasks` 基于文件名创建任务；`POST /tasks/{task_id}/start` 启动处理。
- 处理管线：
  - PDF → 图片切页（每页 ≤2MB，按需降质）。
  - 视觉识别（ZhipuAI）生成 Markdown 文本。
  - 汇总 Markdown → 单页 HTML（杂志级排版）与合稿 PDF。
  - 封面图：优先使用原始 PDF 第一页图片；若缺失则对单页 HTML 首屏进行截图。
- 下载与浏览：最终可通过 `/bundle`、`/cover`、单页 `/pages/{i}/pdf` 获取成果。

---

## 启动与运行
- 项目根目录：`/srv/application/AI驱动的汽车行业情报平台/IntelligencePlatform`
- 启动：
  - `source venv/bin/activate`
  - `python -m uvicorn main:app --host 0.0.0.0 --port 7657 --reload`
- 依赖安装：将依赖写入 `requirements.txt` 并执行 `pip install -r requirements.txt`
- 数据库：使用 PostgreSQL，连接信息读取主项目 `.env` 中 `DB_HOST`、`DB_PORT`、`DB_NAME`、`DB_USER`、`DB_PASSWORD`。

## 环境变量（深度洞察服务 .env）
- `DEEP_INSIGHT_ENABLED`：是否启用服务
- `DEEP_INSIGHT_STORAGE_DIR`：任务存储根目录（默认 `services/deep_insight/storage`）
- `DEEP_INSIGHT_RAW_PDF_DIR`：上传目录（默认 `services/deep_insight/uploads`）
- `DEEP_INSIGHT_HTML_PROVIDER`：HTML 生成提供商（`gemini|zhipuai`）
- `DEEP_INSIGHT_GEMINI_MODEL`、`DEEP_INSIGHT_GEMINI_API_CHANNEL`：Gemini 配置
- `DEEP_INSIGHT_ZHIPUAI_API_KEY`、`DEEP_INSIGHT_ZHIPUAI_VISION_MODEL`：视觉识别配置
- `DEEP_INSIGHT_MARKDOWN2HTML_PROMPT_PATH`：可选，自定义 Markdown→HTML 提示词路径

## 代理与网络
- 位于中国大陆环境建议设置本地代理：`http://127.0.0.1:20171`（HTTP）。
- 如需启用，请在服务 `.env` 中配置：
  - `DEEP_INSIGHT_GEMINI_ENABLE_PROXY=true`
  - `DEEP_INSIGHT_GEMINI_HTTP_PROXY=http://127.0.0.1:20171`

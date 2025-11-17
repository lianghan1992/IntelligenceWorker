# 直播服务 (Livestream Service) API 文档

所有接口统一前缀：`/livestream`，并需要 Bearer Token 认证。

## 认证说明
- 认证方式：在请求头中携带 `Authorization: Bearer <token>`
- 获取方式：使用主服务用户登录接口获取 token

## 任务创建
- 方法：`POST /livestream/tasks`
- 请求体：
  - `task_name`：字符串，任务名称
  - `live_url`：字符串，直播页面或直链地址
  - `start_time`：可选字符串，计划开始时间（ISO 或 `YYYY-MM-DD HH:MM:SS`），将统一存为北京时间字符串
  - `summary_prompt`：可选字符串，选择提示词文件名（默认 `default_summary.md`）
  - `direct_download`：可选布尔，存在直链时是否直接下载
  - `cover_image_b64`：字符串，≤300KB 的 JPG base64（服务端会自动压缩到限制）
- 返回示例：
```
{
  "task_id": "b3d1...",
  "status": "listening",
  "message": "任务创建成功，已开始监听直播状态"
}
```
- curl 示例：
```
curl -X POST "http://localhost:7657/api/livestream/tasks" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "task_name": "发布会直播",
    "live_url": "https://weibo.com/l/wblive/p/show/1022:...",
    "cover_image_b64": "<base64>"
  }'
```

## 任务列表
- 方法：`GET /livestream/tasks`
- 查询参数：
  - `page`：整数，默认 1
  - `page_size`：整数，默认 20
- 返回字段：`total`, `page`, `page_size`, `items[]`
- curl 示例：
```
curl -H "Authorization: Bearer <token>" \
  "http://localhost:7657/api/livestream/tasks?page=1&page_size=20"
```

## 获取任务详情
- 方法：`GET /livestream/tasks/{task_id}`
- 返回：任务完整对象（含 `stats_json`，`created_at`/`updated_at` 为北京时间字符串）
- curl 示例：
```
curl -H "Authorization: Bearer <token>" \
  "http://localhost:7657/api/livestream/tasks/<task_id>"
```

## 获取任务总结/原稿
- 方法：`GET /livestream/tasks/{task_id}/summary`
- 返回：纯文本（`text/plain`），若最终总结不存在则返回原始识别稿
- curl 示例：
```
curl -H "Authorization: Bearer <token>" \
  "http://localhost:7657/api/livestream/tasks/<task_id>/summary"
```

## 启动任务监听
- 方法：`POST /livestream/tasks/{task_id}/start`
- 返回：任务状态及是否为计划启动
- curl 示例：
```
curl -X POST -H "Authorization: Bearer <token>" \
  "http://localhost:7657/api/livestream/tasks/<task_id>/start"
```

## 停止任务
- 方法：`POST /livestream/tasks/{task_id}/stop`
- 返回：`status` 为 `stopped` 或 `stopping`
- curl 示例：
```
curl -X POST -H "Authorization: Bearer <token>" \
  "http://localhost:7657/api/livestream/tasks/<task_id>/stop"
```

## 删除任务
- 方法：`DELETE /livestream/tasks/{task_id}`
- 行为：停止运行中的进程，清理目录并删除数据库记录
- curl 示例：
```
curl -X DELETE -H "Authorization: Bearer <token>" \
  "http://localhost:7657/api/livestream/tasks/<task_id>"
```

## 重新抽帧识别并总结
- 方法：`POST /livestream/tasks/{task_id}/reprocess`
- 请求体：
  - `fps_scale`：可选浮点，对抽帧频率进行缩放
  - `prompt`：可选字符串，覆盖默认提示词文件名
- 返回：处理完成后返回 `finished` 状态及生成路径
- curl 示例：
```
curl -X POST "http://localhost:7657/api/livestream/tasks/<task_id>/reprocess" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"fps_scale": 1.5, "prompt": "02.车企发布会完整总结.md"}'
```

## 重新生成总结
- 方法：`POST /livestream/tasks/{task_id}/resummarize`
- 请求体：
  - `summary_prompt`：可选，覆盖提示词文件名
- 返回：`finished` 状态与总结文件路径
- curl 示例：
```
curl -X POST "http://localhost:7657/api/livestream/tasks/<task_id>/resummarize" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"summary_prompt": "default_summary.md"}'
```

## 列出可用提示词
- 方法：`GET /livestream/prompts`
- 返回：提示词文件名数组
- curl 示例：
```
curl -H "Authorization: Bearer <token>" \
  "http://localhost:7657/api/livestream/prompts"
```
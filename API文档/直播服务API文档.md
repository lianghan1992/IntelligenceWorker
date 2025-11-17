# 直播服务 (Livestream Service) API 文档

所有接口统一前缀：`/livestream`，并需要 Bearer Token 认证。

## 认证说明
- 认证方式：在请求头携带 `Authorization: Bearer <token>`
- 获取方式：使用主服务用户登录接口获得 token

## 创建任务
- 接口介绍：创建一个直播分析任务，自动监听并录制，完成后生成总结。
- 接口方法：`POST /livestream/tasks`
- 字段说明：
  - `task_name`：字符串，必填，任务名称
  - `live_url`：字符串，必填，直播页面或视频直链
  - `start_time`：字符串，可选，计划启动时间（ISO 或 `YYYY-MM-DD HH:MM:SS`），存储为北京时间字符串
  - `summary_prompt`：字符串，可选，提示词文件名（默认 `default_summary.md`）
  - `direct_download`：布尔，可选，存在直链时是否直接下载处理
  - `cover_image_b64`：字符串，可选，JPG base64，服务端会压缩至 ≤300KB
- 返回示例：
```
{
  "task_id": "b3d1a2c4-...",
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
- 接口介绍：分页获取任务列表。
- 接口方法：`GET /livestream/tasks`
- 字段说明（查询参数）：
  - `page`：整数，默认 1
  - `page_size`：整数，默认 20
- 返回示例：
```
{
  "total": 42,
  "page": 1,
  "page_size": 20,
  "items": [
    {
      "id": "b3d1a2c4-...",
      "task_name": "发布会直播",
      "live_url": "https://weibo.com/...",
      "start_time": "2025-11-17 20:00:00+08:00",
      "summary_prompt": "default_summary.md",
      "status": "listening",
      "created_at": "2025-11-17 19:30:12+08:00",
      "updated_at": "2025-11-17 19:30:12+08:00",
      "dir": "recordings/25-11-17-发布会直播-b3d1a2c4...",
      "cover_image_b64": "...",
      "stats_json": "{\"mode\":\"segment\"}"
    }
  ]
}
```
- curl 示例：
```
curl -H "Authorization: Bearer <token>" \
  "http://localhost:7657/api/livestream/tasks?page=1&page_size=20"
```

## 获取任务详情
- 接口介绍：获取单个任务的完整信息。
- 接口方法：`GET /livestream/tasks/{task_id}`
- 返回示例：同“任务列表”中的 `items[0]` 完整对象。
- curl 示例：
```
curl -H "Authorization: Bearer <token>" \
  "http://localhost:7657/api/livestream/tasks/<task_id>"
```

## 获取任务总结
- 接口介绍：返回最终总结；若不存在则返回原稿；均为纯文本。
- 接口方法：`GET /livestream/tasks/{task_id}/summary`
- 返回示例（`text/plain`）：
```
会议核心摘要：...
```
- curl 示例：
```
curl -H "Authorization: Bearer <token>" \
  "http://localhost:7657/api/livestream/tasks/<task_id>/summary"
```

## 启动任务
- 接口介绍：启动监听（或等待计划启动）。
- 接口方法：`POST /livestream/tasks/{task_id}/start`
- 返回示例：
```
{
  "task_id": "b3d1a2c4-...",
  "status": "listening",
  "message": "任务已启动监听/等待录制"
}
```
- curl 示例：
```
curl -X POST -H "Authorization: Bearer <token>" \
  "http://localhost:7657/api/livestream/tasks/<task_id>/start"
```

## 停止任务
- 接口介绍：停止监听或录制。
- 接口方法：`POST /livestream/tasks/{task_id}/stop`
- 返回示例：
```
{
  "task_id": "b3d1a2c4-...",
  "status": "stopping",
  "message": "任务停止中"
}
```
- curl 示例：
```
curl -X POST -H "Authorization: Bearer <token>" \
  "http://localhost:7657/api/livestream/tasks/<task_id>/stop"
```

## 删除任务
- 接口介绍：停止运行中的流程、清理目录并删除记录。
- 接口方法：`DELETE /livestream/tasks/{task_id}`
- 返回示例：
```
{
  "task_id": "b3d1a2c4-...",
  "status": "deleted",
  "message": "任务已删除"
}
```
- curl 示例：
```
curl -X DELETE -H "Authorization: Bearer <token>" \
  "http://localhost:7657/api/livestream/tasks/<task_id>"
```

## 重新抽帧识别并总结
- 接口介绍：清理旧帧，重新抽帧、识别并生成总结。
- 接口方法：`POST /livestream/tasks/{task_id}/reprocess`
- 字段说明（请求体）：
  - `fps_scale`：浮点，可选，抽帧频率缩放
  - `prompt`：字符串，可选，覆盖提示词文件名
- 返回示例：
```
{
  "task_id": "b3d1a2c4-...",
  "status": "finished",
  "message": "处理完成"
}
```
- curl 示例：
```
curl -X POST "http://localhost:7657/api/livestream/tasks/<task_id>/reprocess" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"fps_scale": 1.5, "prompt": "02.车企发布会完整总结.md"}'
```

## 重新生成总结
- 接口介绍：使用指定提示词重新生成最终总结。
- 接口方法：`POST /livestream/tasks/{task_id}/resummarize`
- 字段说明（请求体）：
  - `summary_prompt`：字符串，可选，覆盖提示词文件名
- 返回示例：
```
{
  "task_id": "b3d1a2c4-...",
  "status": "finished",
  "message": "总结已更新"
}
```
- curl 示例：
```
curl -X POST "http://localhost:7657/api/livestream/tasks/<task_id>/resummarize" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"summary_prompt": "default_summary.md"}'
```

## 列出可用提示词
- 接口介绍：列出可用的提示词文件名，默认不包含 `default_summary.md` 与 `vision_analysis.md`。
- 接口方法：`GET /livestream/prompts`
- 返回示例：
```
{
  "prompts": [
    "01.车企发布会摘要总结.md",
    "02.车企发布会完整总结.md",
    "03.视频内容总结.md",
    "04.峰会论坛总结.md"
  ]
}
```
- curl 示例：
```
curl -H "Authorization: Bearer <token>" \
  "http://localhost:7657/api/livestream/prompts"
```
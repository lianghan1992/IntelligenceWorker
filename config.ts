// src/config.ts

/**
 * 开发阶段配置文件
 * 注意：在生产环境中，这些敏感信息应该通过环境变量等更安全的方式进行管理。
 */

// API Base URL
// 使用相对路径，以便在不同环境（Vite开发服务器、Node、Apache）中进行代理。
// 服务器需要配置将 /api 的请求代理到实际的后端API。
export const API_BASE_URL = '/api';


// Jina AI Reader URL (无需密钥)
export const JINA_READER_URL = 'https://r.jina.ai/';

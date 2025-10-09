// src/config.ts

/**
 * 开发阶段配置文件
 * 注意：在生产环境中，这些敏感信息应该通过环境变量等更安全的方式进行管理。
 */

// API Base URL for the main application service (port 7656)
// 使用相对路径，以便在不同环境（Vite开发服务器、Node、Apache）中进行代理。
// 服务器需要配置将 /api 的请求代理到实际的后端API。
export const API_BASE_URL = '/api';

// API Base URL for the user authentication & subscription service (port 7657)
// Apache will be configured to proxy this path to the correct service.
export const USER_API_BASE_URL = '/api/users';

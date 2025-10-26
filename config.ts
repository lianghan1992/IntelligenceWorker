// src/config.ts

/**
 * 开发阶段配置文件
 * 注意：在生产环境中，这些敏感信息应该通过环境变量等更安全的方式进行管理。
 */

// 通用API前缀，用于代理路由
// 重要提示：这是一个相对路径。浏览器会自动使用当前页面的协议（例如 https）和主机来构建完整的请求URL。
// 这是避免由前端引起的“混合内容 (Mixed Content)”错误的正确方法。
//
// 如果您遇到“混合内容”错误（即浏览器在 https 页面上阻止了对 http:// URL的请求），
// 根本原因几乎可以肯定是服务器端的重定向 (Server-Side Redirect)。
// 这种情况的发生流程如下：
// 1. 前端发送一个正确的相对路径请求 (例如 /api/user)，浏览器将其解析为 https://...
// 2. 后端服务不知道自己位于HTTPS代理之后，发出一个重定向（例如，从 /user 重定向到 /user/），
//    但在生成重定向地址时，错误地使用了一个绝对的 http:// URL。
// 3. 浏览器阻止了这个不安全的重定向。
//
// 解决方案在后端/代理层面：
// 代理服务器必须发送 `X-Forwarded-Proto: https` 请求头，并且后端应用服务器
// (例如 Uvicorn) 必须配置为信任代理头（例如，使用 `--proxy-headers` 标志）。

// 临时调整：根据后端团队的请求，暂时移除 /api 前缀以绕过重定向问题。
// 后端修复后，应将此值恢复为 '/api'。
export const API_BASE_URL = '';

// Full path for the user authentication & subscription service
export const USER_SERVICE_PATH = `${API_BASE_URL}/user`;

// Full path for the main intelligence data service
export const INTELLIGENCE_SERVICE_PATH = `${API_BASE_URL}/intelligence`;

// Full path for livestream analysis service
export const LIVESTREAM_SERVICE_PATH = `${API_BASE_URL}/livestream`;

// Full path for competitiveness dashboard service
export const COMPETITIVENESS_SERVICE_PATH = `${API_BASE_URL}/competitiveness`;
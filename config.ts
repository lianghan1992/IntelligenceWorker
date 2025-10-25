// src/config.ts

/**
 * 开发阶段配置文件
 * 注意：在生产环境中，这些敏感信息应该通过环境变量等更安全的方式进行管理。
 */

// General API prefix for proxy routing (e.g., in Apache or Vite dev server)
export const API_BASE_URL = '/api';

// Full path for the user authentication & subscription service
export const USER_SERVICE_PATH = `${API_BASE_URL}/user`;

// Full path for the main intelligence data service
export const INTELLIGENCE_SERVICE_PATH = `${API_BASE_URL}/intelligence`;

// Full path for livestream analysis service
export const LIVESTREAM_SERVICE_PATH = `${API_BASE_URL}/livestream`;

// Full path for competitiveness dashboard service
export const COMPETITIVENESS_SERVICE_PATH = `${API_BASE_URL}/competitiveness`;

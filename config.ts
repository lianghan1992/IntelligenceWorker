// src/config.ts

/**
 * 开发阶段配置文件
 * 注意：在生产环境中，这些敏感信息应该通过环境变量等更安全的方式进行管理。
 */

// 通用API前缀，用于代理路由。
// 后端已通过 root_path="/api" 修复了重定向问题，
// 因此前端所有请求应恢复使用此 /api 前缀。
export const API_BASE_URL = '/api';

// Full path for the user authentication & subscription service
export const USER_SERVICE_PATH = `${API_BASE_URL}/user`;

// Full path for the main intelligence data service
export const INTELLIGENCE_SERVICE_PATH = `${API_BASE_URL}/crawler`;

// Full path for livestream analysis service
export const LIVESTREAM_SERVICE_PATH = `${API_BASE_URL}/livestream`;

// Full path for competitiveness dashboard service (Legacy admin endpoints)
export const COMPETITIVENESS_SERVICE_PATH = `${API_BASE_URL}/competitiveness`;

// Full path for NEW competitiveness analysis service (Knowledge Base)
export const COMPETITIVENESS_ANALYSIS_SERVICE_PATH = `${API_BASE_URL}/competitiveness_analysis`;

// Full path for the document processing service
export const DOCUMENT_PROCESSING_SERVICE_PATH = `${API_BASE_URL}/document-processing`;

// Full path for Deep Insight service
export const DEEP_INSIGHT_SERVICE_PATH = `${API_BASE_URL}/deep_insight`;

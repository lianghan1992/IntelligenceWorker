
// src/config.ts

/**
 * 开发阶段配置文件
 * 注意：在生产环境中，这些敏感信息应该通过环境变量等更安全的方式进行管理。
 */

// 通用API前缀。现在指向独立的后端服务器地址。
export const API_BASE_URL = 'https://autoinsight_api.jingyu.today:8081';

// Full path for the user authentication & subscription service
export const USER_SERVICE_PATH = `${API_BASE_URL}/api/user`;

// Full path for the main intelligence data service
export const INTELSPIDER_SERVICE_PATH = `${API_BASE_URL}/api/intelspider`;

// Full path for livestream analysis service
export const LIVESTREAM_SERVICE_PATH = `${API_BASE_URL}/api/livestream`;

// Full path for competitiveness dashboard service
export const COMPETITIVENESS_SERVICE_PATH = `${API_BASE_URL}/api/competitiveness`;

// Full path for NEW competitiveness analysis service (Knowledge Base)
export const COMPETITIVENESS_ANALYSIS_SERVICE_PATH = `${API_BASE_URL}/competitiveness_analysis`;

// Full path for the document processing service
export const DOCUMENT_PROCESSING_SERVICE_PATH = `${API_BASE_URL}/document-processing`;

// Full path for Deep Insight service
export const DEEP_INSIGHT_SERVICE_PATH = `${API_BASE_URL}/deep_insight`;

// Full path for StratifyAI service (AI Report Generator)
export const STRATIFY_SERVICE_PATH = `${API_BASE_URL}/stratifyai`;
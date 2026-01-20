
import { API_BASE_URL } from '../config';
import { apiFetch } from './helper';
import { CommonSearchResponse, CommonSearchStatus } from '../types';

const COMMON_SERVICE_PATH = `${API_BASE_URL}/api/common`;

export interface CommonSearchParams {
    query: string;
    region?: string;
    max_results?: number;
    search_type?: 'text' | 'news';
    file_type?: string;
    time_limit?: string;
}

/**
 * 执行通用网页或新闻搜索
 * 严格对应 POST /api/common/search
 */
export const performCommonSearch = async (params: CommonSearchParams): Promise<CommonSearchResponse> => {
    const token = localStorage.getItem('accessToken') || '';
    
    // 严格按照文档，accessToken 作为必填字段放入请求体
    return apiFetch<CommonSearchResponse>(`${COMMON_SERVICE_PATH}/search`, {
        method: 'POST',
        body: JSON.stringify({
            accessToken: token,
            query: params.query,
            region: params.region || 'wt-wt',
            max_results: params.max_results || 10,
            search_type: params.search_type || 'text',
            file_type: params.file_type || undefined,
            time_limit: params.time_limit || undefined
        })
    });
};

/**
 * 获取搜索服务状态
 * 严格对应 GET /api/common/search/status
 */
export const getCommonSearchStatus = (): Promise<CommonSearchStatus> => 
    apiFetch<CommonSearchStatus>(`${COMMON_SERVICE_PATH}/search/status`);

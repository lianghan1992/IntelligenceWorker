
import { API_BASE_URL } from '../config';
import { apiFetch } from './helper';
import { CommonSearchResponse, CommonSearchStatus } from '../types';

const COMMON_SERVICE_PATH = `${API_BASE_URL}/api/common`;

export interface CommonSearchParams {
    query: string;
    region?: string;
    max_results?: number;
    search_type?: 'text' | 'news';
}

/**
 * 执行通用网页或新闻搜索
 */
export const performCommonSearch = async (params: CommonSearchParams): Promise<CommonSearchResponse> => {
    const token = localStorage.getItem('accessToken') || '';
    
    // 根据文档，accessToken 需要在 body 中传递
    return apiFetch<CommonSearchResponse>(`${COMMON_SERVICE_PATH}/search`, {
        method: 'POST',
        body: JSON.stringify({
            ...params,
            accessToken: token
        })
    });
};

/**
 * 获取搜索服务状态
 */
export const getCommonSearchStatus = (): Promise<CommonSearchStatus> => 
    apiFetch<CommonSearchStatus>(`${COMMON_SERVICE_PATH}/search/status`);

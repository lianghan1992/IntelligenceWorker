
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

/**
 * 通用搜索（流式 SSE）
 * 适合大数据量检索
 */
export const streamCommonSearch = async (
    params: CommonSearchParams,
    onData: (item: any) => void,
    onComplete?: () => void,
    onError?: (err: any) => void
) => {
    const token = localStorage.getItem('accessToken') || '';
    
    try {
        const response = await fetch(`${COMMON_SERVICE_PATH}/search/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // SSE 通常不需要 Authorization header，因为 token 在 body 里，但加上也无妨
            },
            body: JSON.stringify({
                accessToken: token,
                query: params.query,
                region: params.region || 'wt-wt',
                max_results: params.max_results || 100, // 默认 100
                search_type: params.search_type || 'text',
                file_type: params.file_type || undefined,
                time_limit: params.time_limit || undefined
            })
        });

        if (!response.ok) {
            throw new Error(`Search failed: ${response.statusText}`);
        }
        
        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            // 保留最后一个可能不完整的片段
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                
                // 处理 SSE 格式
                if (trimmed.startsWith('event: complete')) {
                    if (onComplete) onComplete();
                    return;
                }
                
                if (trimmed.startsWith('data: ')) {
                    const dataStr = trimmed.slice(6).trim();
                    if (!dataStr) continue;
                    
                    try {
                        const json = JSON.parse(dataStr);
                        // 忽略空对象（有时 SSE 会发送空保活包）
                        if (Object.keys(json).length > 0) {
                            onData(json);
                        }
                    } catch (e) {
                        console.warn('Failed to parse SSE data:', dataStr);
                    }
                }
            }
        }
        
        // 处理流结束后的剩余 buffer
        if (buffer.startsWith('data: ')) {
             try {
                const json = JSON.parse(buffer.slice(6));
                if (Object.keys(json).length > 0) onData(json);
            } catch (e) {}
        }

        if (onComplete) onComplete();

    } catch (error) {
        console.error("Stream search error:", error);
        if (onError) onError(error);
    }
};

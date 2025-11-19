
// src/api/intelligence.ts

import { INTELLIGENCE_SERVICE_PATH } from '../config';
import { 
    Subscription, InfoItem, SystemSource, PaginatedResponse, 
    SearchResult, IntelligenceTask,
   SearchChunksResponse, ExportChunksResponse, LlmSearchRequest, LlmSearchResponse,
   LlmSearchTasksResponse
} from '../types';
import { apiFetch, createApiQuery } from './helper';
import { getUserSubscribedSources } from './user';

// --- Intelligence Points & Sources API ---
export const getSubscriptions = async (): Promise<Subscription[]> => {
    const subscribedSources = await getUserSubscribedSources();
    if (subscribedSources.length === 0) {
        return [];
    }
    const pointsPromises = subscribedSources.map(source => 
        getPointsBySourceName(source.source_name)
    );
    const pointsBySource = await Promise.all(pointsPromises);
    return pointsBySource.flat();
};

export const getSources = (): Promise<SystemSource[]> => apiFetch<SystemSource[]>(`${INTELLIGENCE_SERVICE_PATH}/sources`);

export const getSourceNames = (): Promise<string[]> => apiFetch<string[]>(`${INTELLIGENCE_SERVICE_PATH}/sources/names`);

export const deleteSource = (sourceName: string): Promise<void> => 
    apiFetch<void>(`${INTELLIGENCE_SERVICE_PATH}/sources/${encodeURIComponent(sourceName)}`, { method: 'DELETE' });

export const getPointsBySourceName = (sourceName: string): Promise<Subscription[]> =>
    apiFetch<Subscription[]>(`${INTELLIGENCE_SERVICE_PATH}/points${createApiQuery({ source_name: sourceName })}`);
    
export const createIntelligencePoint = (data: Partial<Subscription>): Promise<{ message: string, point_id: string }> => 
    apiFetch<{ message: string, point_id: string }>(`${INTELLIGENCE_SERVICE_PATH}/points`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

export const deleteIntelligencePoints = (pointIds: string[]): Promise<void> => 
    apiFetch<void>(`${INTELLIGENCE_SERVICE_PATH}/points`, {
        method: 'DELETE',
        body: JSON.stringify({ point_ids: pointIds }),
    });

// --- Articles / InfoItems API ---
export const searchArticles = (query: string, pointIds: string[], top_k: number): Promise<InfoItem[]> =>
    apiFetch<InfoItem[]>(`${INTELLIGENCE_SERVICE_PATH}/search/articles${createApiQuery({ top_k })}`, {
        method: 'POST',
        body: JSON.stringify({ query_text: query, point_ids: pointIds }),
    });

export const searchArticlesFiltered = async (params: any): Promise<PaginatedResponse<SearchResult>> => {
    // Destructure to separate query text/pagination from filters
    const { query_text, page, limit, similarity_threshold, ...restFilters } = params;
    
    // Check if it's a general filter query (empty or '*')
    const isGeneralFilter = !query_text || query_text === '*' || query_text.trim() === '';

    if (isGeneralFilter) {
        // CASE 1: General Filtering (e.g., Dashboard "Today's News")
        // Use /crawler/articles per API Doc
        
        const payload: any = {
            filters: {
                // Map flat params to the 'filters' object structure required by the backend
                source_names: restFilters.source_names,
                publish_date_start: restFilters.publish_date_start,
                publish_date_end: restFilters.publish_date_end,
                point_ids: restFilters.point_ids,
                min_influence_score: restFilters.min_influence_score,
                sentiment: restFilters.sentiment,
            },
            page: page || 1,
            limit: limit || 20
        };

        // Clean up undefined filters
        Object.keys(payload.filters).forEach(key => {
            const val = payload.filters[key];
            if (val === undefined || val === null || (Array.isArray(val) && val.length === 0) || val === '') {
                delete payload.filters[key];
            }
        });

        return apiFetch<PaginatedResponse<SearchResult>>(`${INTELLIGENCE_SERVICE_PATH}/articles`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });

    } else {
        // CASE 2: Semantic/Keyword Search (e.g., Focus Points, Search Bar)
        // Use /crawler/search/combined per API Doc
        
        const payload: any = {
            query: query_text,
            top_k: 100, // Default reasonably high for list views
            min_score: similarity_threshold,
            filters: {
                source_names: restFilters.source_names,
                publish_date_start: restFilters.publish_date_start,
                publish_date_end: restFilters.publish_date_end,
                point_ids: restFilters.point_ids,
            }
        };

        // Clean up undefined filters
        Object.keys(payload.filters).forEach(key => {
            const val = payload.filters[key];
            if (val === undefined || val === null || (Array.isArray(val) && val.length === 0) || val === '') {
                delete payload.filters[key];
            }
        });

        // The /search/combined endpoint returns chunks/items. We map them to SearchResult (InfoItem) format.
        // Note: The combined endpoint usually returns 'content_chunk', we map it to 'content' for preview.
        const response = await apiFetch<any>(`${INTELLIGENCE_SERVICE_PATH}/search/combined`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        const items = (response.items || []).map((item: any) => ({
            id: item.article_id || String(Math.random()),
            title: item.title || item.article_title || '无标题',
            content: item.content_chunk || item.content || '', // Use chunk as content preview
            original_url: item.original_url || item.article_url || '#',
            source_name: item.source_name || '未知来源',
            point_name: item.point_name || '',
            point_id: item.point_id || '',
            publish_date: item.publish_date,
            created_at: item.created_at || new Date().toISOString(),
            similarity_score: item.score
        }));

        return {
            items: items,
            total: response.total || items.length,
            page: page || 1,
            limit: limit || 20,
            totalPages: Math.ceil((response.total || items.length) / (limit || 20)) || 1
        };
    }
};

export const processUrlToInfoItem = (url: string, setFeedback: (msg: string) => void): Promise<InfoItem> => {
    setFeedback('正在抓取URL内容...');
    return new Promise(resolve => setTimeout(() => {
        setFeedback('分析内容并提取关键信息...');
        resolve(apiFetch<InfoItem>(`${INTELLIGENCE_SERVICE_PATH}/process_url`, {
            method: 'POST',
            body: JSON.stringify({ url }),
        }));
    }, 1500));
};

// --- Chunk Search API ---
export const searchChunks = async (params: any): Promise<SearchChunksResponse> => {
    // Adapter for new API endpoint /search/combined (based on provided API doc)
    // Maps frontend flat params to nested filter structure expected by API
    const { 
        query_text, 
        top_k, 
        similarity_threshold, 
        source_names, 
        publish_date_start, 
        publish_date_end,
        // Extract other known filters if needed, ignore unknown props
    } = params;

    const payload: any = {
        query: query_text || '*',
        top_k: top_k || 200,
        min_score: similarity_threshold,
        filters: {
            source_names,
            publish_date_start,
            publish_date_end,
        }
    };

    // Clean undefined filters
    Object.keys(payload.filters).forEach(key => {
        if (payload.filters[key] === undefined || payload.filters[key] === null || (Array.isArray(payload.filters[key]) && payload.filters[key].length === 0)) {
            delete payload.filters[key];
        }
    });

    const response = await apiFetch<any>(`${INTELLIGENCE_SERVICE_PATH}/search/combined`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });

    // Map API response to SearchChunksResponse
    // Expected API item: { article_id, content_chunk, score, ...maybe metadata }
    const results = (response.items || []).map((item: any, index: number) => ({
        article_id: String(item.article_id),
        // Use fallback values as the 'combined' endpoint might return sparse data
        article_title: item.title || item.article_title || 'Unknown Title', 
        article_url: item.original_url || item.article_url || '',
        article_publish_date: item.publish_date || null,
        source_name: item.source_name || 'Unknown Source',
        chunk_index: item.chunk_index || index,
        chunk_text: item.content_chunk || '',
        similarity_score: item.score || 0
    }));

    return {
        results,
        total_chunks: response.total || results.length,
        total_articles: 0 // Not provided by combined search
    };
};

export const exportChunks = (params: any): Promise<ExportChunksResponse> =>
    apiFetch<ExportChunksResponse>(`${INTELLIGENCE_SERVICE_PATH}/search/chunks/export`, {
        method: 'POST',
        body: JSON.stringify(params),
    });


// --- Intelligence Tasks (formerly Crawler Tasks) API ---
export const getIntelligenceTasks = (params: any): Promise<PaginatedResponse<IntelligenceTask>> => {
    const query = createApiQuery(params);
    return apiFetch<PaginatedResponse<IntelligenceTask>>(`${INTELLIGENCE_SERVICE_PATH}/tasks${query}`);
};

// --- LLM Search API ---
export const createLlmSearchTask = (data: LlmSearchRequest): Promise<LlmSearchResponse> =>
    apiFetch<LlmSearchResponse>(`${INTELLIGENCE_SERVICE_PATH}/search/llm`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

export const getLlmSearchTasks = (params: any): Promise<LlmSearchTasksResponse> => {
    const query = createApiQuery(params);
    return apiFetch<LlmSearchTasksResponse>(`${INTELLIGENCE_SERVICE_PATH}/search/tasks${query}`);
};

export const downloadLlmTaskResult = async (taskId: string): Promise<Blob> => {
    const url = `${INTELLIGENCE_SERVICE_PATH}/search/tasks/${taskId}/download`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
        throw new Error(errorData.message || '下载失败');
    }
    return response.blob();
};

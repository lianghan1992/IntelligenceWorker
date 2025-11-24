
// src/api/intelligence.ts

import { INTELLIGENCE_SERVICE_PATH } from '../config';
import { 
    Subscription, InfoItem, SystemSource, PaginatedResponse, 
    SearchResult, IntelligenceTask,
   SearchChunksResponse, ExportChunksResponse, LlmSearchRequest, LlmSearchResponse,
   LlmSearchTasksResponse, LlmSearchTaskDetail
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
    apiFetch<InfoItem[]>(`${INTELLIGENCE_SERVICE_PATH}/search/combined`, {
        method: 'POST',
        body: JSON.stringify({ 
            query: query, 
            filters: { point_ids: pointIds },
            top_k 
        }),
    });

export const searchArticlesFiltered = async (params: any): Promise<PaginatedResponse<SearchResult>> => {
    // Destructure to separate query text/pagination from filters
    const { query_text, page, limit, similarity_threshold, ...restFilters } = params;
    
    // Check if it's a general filter query (empty or '*')
    const isGeneralFilter = !query_text || query_text === '*' || query_text.trim() === '';

    // Helper to clean filters
    const cleanFilters = (filters: any) => {
        const cleaned: any = {};
        Object.keys(filters).forEach(key => {
            const val = filters[key];
            if (val !== undefined && val !== null && !(Array.isArray(val) && val.length === 0) && val !== '') {
                cleaned[key] = val;
            }
        });
        return cleaned;
    };

    if (isGeneralFilter) {
        // CASE 1: General Filtering (e.g., Dashboard "Today's News", Main List)
        // Use /crawler/feed per API Doc
        
        const payload: any = {
            filters: cleanFilters({
                source_names: restFilters.source_names,
                publish_date_start: restFilters.publish_date_start,
                publish_date_end: restFilters.publish_date_end,
                point_ids: restFilters.point_ids,
                min_influence_score: restFilters.min_influence_score,
                sentiment: restFilters.sentiment,
            }),
            page: page || 1,
            limit: limit || 20
        };

        return apiFetch<PaginatedResponse<SearchResult>>(`${INTELLIGENCE_SERVICE_PATH}/feed`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });

    } else {
        // CASE 2: Semantic/Keyword Search (e.g., Focus Points, Search Bar)
        // Use /crawler/search/combined per API Doc to support filters + vector search
        
        const payload: any = {
            query: query_text,
            filters: cleanFilters({
                source_names: restFilters.source_names,
                publish_date_start: restFilters.publish_date_start,
                publish_date_end: restFilters.publish_date_end,
                point_ids: restFilters.point_ids,
                min_influence_score: restFilters.min_influence_score,
                sentiment: restFilters.sentiment,
            }),
            top_k: 100,
            min_score: similarity_threshold || 0.2,
            page: page || 1,
            limit: limit || 20,
        };

        // The combined endpoint returns { items: [{ article_id, content_chunk, score, ... }] }
        // We need to map this to our SearchResult format.
        const response = await apiFetch<any>(`${INTELLIGENCE_SERVICE_PATH}/search/combined`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        // Map semantic results to SearchResult format
        const items = (response.items || []).map((item: any) => ({
            // Prioritize article_id or id. Fallback to a temp_ ID to prevent invalid API calls.
            id: item.article_id ? String(item.article_id) : (item.id ? String(item.id) : `temp_${Math.random()}`),
            title: item.title || item.article_title || '相关情报片段',
            content: item.content_chunk || item.content || '', // Use chunk as content preview
            original_url: item.original_url || item.article_url || '#',
            source_name: item.source_name || '智能检索',
            point_name: item.point_name || '',
            point_id: item.point_id || '',
            publish_date: item.publish_date,
            created_at: item.created_at || new Date().toISOString(),
            similarity_score: item.score
        }));

        return {
            items: items,
            total: items.length, // Semantic search usually doesn't return total count of DB, just top_k
            page: 1,
            limit: items.length,
            totalPages: 1
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

// --- HTML Report API ---
export const getArticleHtml = async (articleId: string): Promise<string | null> => {
    const url = `${INTELLIGENCE_SERVICE_PATH}/articles/${articleId}/html`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, { headers });

    if (response.status === 404) {
        return null; // HTML report not generated yet
    }

    if (!response.ok) {
        console.warn(`Failed to fetch HTML for article ${articleId}: ${response.status}`);
        return null;
    }

    return response.text();
};

export const downloadArticlePdf = async (articleId: string): Promise<Blob> => {
    const url = `${INTELLIGENCE_SERVICE_PATH}/articles/${articleId}/pdf`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, { headers });

    if (response.status === 404) {
        throw new Error("报告尚未生成，请稍后再试");
    }

    if (!response.ok) {
        const errorText = await response.text().catch(() => '下载失败');
        throw new Error(errorText || `下载失败: ${response.status}`);
    }

    return response.blob();
};

// --- Chunk Search API ---
export const searchChunks = async (params: any): Promise<SearchChunksResponse> => {
    // Use /search/combined for chunks as well to ensure consistency
    const { 
        query_text, 
        top_k, 
        similarity_threshold, 
        source_names, 
        publish_date_start,
        publish_date_end
    } = params;

    // Construct filters object
    const filters: any = {};
    if (source_names && source_names.length > 0) filters.source_names = source_names;
    if (publish_date_start) filters.publish_date_start = publish_date_start;
    if (publish_date_end) filters.publish_date_end = publish_date_end;

    const payload: any = {
        query: query_text || '*',
        filters: filters,
        top_k: top_k || 200,
        min_score: similarity_threshold,
    };

    const response = await apiFetch<any>(`${INTELLIGENCE_SERVICE_PATH}/search/combined`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });

    const results = (response.items || []).map((item: any, index: number) => ({
        article_id: String(item.article_id),
        article_title: item.title || item.article_title || '未知标题', 
        article_url: item.original_url || item.article_url || '',
        article_publish_date: item.publish_date || null,
        source_name: item.source_name || '未知来源',
        chunk_index: item.chunk_index || index,
        chunk_text: item.content_chunk || '',
        similarity_score: item.score || 0
    }));

    return {
        results,
        total_chunks: results.length,
        total_articles: 0 
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

export const getLlmSearchTask = (taskId: string): Promise<LlmSearchTaskDetail> => {
    return apiFetch<LlmSearchTaskDetail>(`${INTELLIGENCE_SERVICE_PATH}/search/tasks/${taskId}`);
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

// --- Gemini Management ---
export const updateGeminiCookies = (data: { secure_1psid: string; secure_1psidts: string; http_proxy?: string }): Promise<{ message: string; initialized: boolean }> =>
    apiFetch<{ message: string; initialized: boolean }>(`${INTELLIGENCE_SERVICE_PATH}/gemini/cookies`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

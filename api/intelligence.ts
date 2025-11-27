
// src/api/intelligence.ts

import { INTELLIGENCE_SERVICE_PATH } from '../config';
import { 
    Subscription, InfoItem, SystemSource, PaginatedResponse, 
    SearchResult,
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

// Updated: Delete source by name
export const deleteSource = (sourceName: string): Promise<void> => 
    apiFetch<void>(`${INTELLIGENCE_SERVICE_PATH}/sources/${encodeURIComponent(sourceName)}`, { method: 'DELETE' });

export const getPointsBySourceName = (sourceName: string): Promise<Subscription[]> =>
    apiFetch<Subscription[]>(`${INTELLIGENCE_SERVICE_PATH}/points${createApiQuery({ source_name: sourceName })}`);
    
export const createIntelligencePoint = (data: Partial<Subscription>): Promise<{ message: string, point_id: string }> => 
    apiFetch<{ message: string, point_id: string }>(`${INTELLIGENCE_SERVICE_PATH}/points`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

// Updated: Batch delete points with body
// Fix: Explicitly set Content-Type for DELETE with body to avoid 422
export const deleteIntelligencePoints = (pointIds: string[]): Promise<void> => 
    apiFetch<void>(`${INTELLIGENCE_SERVICE_PATH}/points`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ point_ids: pointIds }),
    });

// NEW: Toggle point status
export const toggleIntelligencePoint = (pointId: string, enable: boolean): Promise<{ success: boolean, message: string }> =>
    apiFetch<{ success: boolean, message: string }>(`${INTELLIGENCE_SERVICE_PATH}/points/${pointId}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ enable }),
    });

// NEW: Toggle all points in a source
export const toggleSource = (sourceName: string, enable: boolean): Promise<{ success: boolean, message: string }> =>
    apiFetch<{ success: boolean, message: string }>(`${INTELLIGENCE_SERVICE_PATH}/sources/${encodeURIComponent(sourceName)}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ enable }),
    });

// NEW: Check point health
export const checkIntelligencePointHealth = (pointId: string): Promise<{ status: string, message: string, last_success_time?: string }> =>
    apiFetch<{ status: string, message: string, last_success_time?: string }>(`${INTELLIGENCE_SERVICE_PATH}/points/${pointId}/health`);

// NEW: Run crawler immediately
export const runCrawler = (sourceName: string): Promise<{ message: string; source_name: string; module_path: string }> =>
    apiFetch<{ message: string; source_name: string; module_path: string }>(
        `${INTELLIGENCE_SERVICE_PATH}/crawlers/${encodeURIComponent(sourceName)}/run-now`, 
        { method: 'POST' }
    );


// --- Articles Management (New RESTful APIs) ---

// Updated: Get articles using new endpoint
export const getArticles = (params: { 
    page?: number; 
    limit?: number; 
    source_name?: string; 
    point_name?: string;
    publish_date_start?: string;
    publish_date_end?: string;
    point_ids?: string[];
}): Promise<PaginatedResponse<InfoItem>> => {
    const query = createApiQuery(params);
    return apiFetch<PaginatedResponse<InfoItem>>(`${INTELLIGENCE_SERVICE_PATH}/articles${query}`);
};

// Updated: Batch delete articles
// Fix: Explicitly set Content-Type for DELETE with body to avoid 422 Unprocessable Entity
export const deleteArticles = (articleIds: string[]): Promise<{ message: string }> => 
    apiFetch<{ message: string }>(`${INTELLIGENCE_SERVICE_PATH}/articles`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_ids: articleIds }),
    });

// --- Search & Feed ---

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
        // CASE 1: General Filtering (Feed)
        const payload: any = {
            ...cleanFilters({
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
        // CASE 2: Semantic/Keyword Search
        const payload: any = {
            query: query_text,
            ...cleanFilters({
                source_names: restFilters.source_names,
                publish_date_start: restFilters.publish_date_start,
                publish_date_end: restFilters.publish_date_end,
                point_ids: restFilters.point_ids,
                min_influence_score: restFilters.min_influence_score,
                sentiment: restFilters.sentiment,
            }),
            top_k: 100, // Use reasonable top_k for semantic search
            // min_score: similarity_threshold || 0.2, // API might handle this differently now, passing payload directly
            page: page || 1,
            limit: limit || 20,
        };

        // Use combined search for semantic + filtering
        const response = await apiFetch<any>(`${INTELLIGENCE_SERVICE_PATH}/search/combined`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        // Map semantic results to SearchResult format
        const items = (response.items || []).map((item: any) => ({
            id: item.article_id ? String(item.article_id) : (item.id ? String(item.id) : `temp_${Math.random()}`),
            title: item.title || item.article_title || '相关情报片段',
            content: item.content_chunk || item.content || '',
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
            total: response.total || items.length,
            page: response.page || 1,
            limit: response.limit || items.length,
            totalPages: 1 // Semantic search pagination logic varies
        };
    }
};

export const processUrlToInfoItem = (url: string, setFeedback: (msg: string) => void): Promise<InfoItem> => {
    // Deprecated or placeholder logic as per new doc, keep for compatibility if used
    setFeedback('分析内容并提取关键信息...');
    return new Promise((resolve, reject) => reject("Feature deprecated in new API"));
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
        return null;
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

export const toggleHtmlGeneration = (enable: boolean): Promise<{ ok: boolean, enabled: boolean }> =>
    apiFetch<{ ok: boolean, enabled: boolean }>(`${INTELLIGENCE_SERVICE_PATH}/html-generation/toggle${createApiQuery({ enable })}`, {
        method: 'POST'
    });

// --- Chunk Search API ---
export const searchChunks = async (params: any): Promise<SearchChunksResponse> => {
    const { 
        query_text, 
        top_k, 
        similarity_threshold, 
        source_names, 
        publish_date_start,
        publish_date_end
    } = params;

    const payload: any = {
        query_text: query_text || '*',
        point_ids: [], // Add specific filters if needed
        source_names: source_names || [],
        similarity_threshold: similarity_threshold,
        top_k: top_k || 20,
        include_article_content: false
    };

    return apiFetch<SearchChunksResponse>(`${INTELLIGENCE_SERVICE_PATH}/search/chunks`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
};

export const exportChunks = (params: any): Promise<ExportChunksResponse> =>
    apiFetch<ExportChunksResponse>(`${INTELLIGENCE_SERVICE_PATH}/search/chunks/export`, {
        method: 'POST',
        body: JSON.stringify(params),
    });


// --- Intelligence Stats (Replaces Intelligence Tasks) ---
// Updated to match /tasks/stats response
export const getIntelligenceStats = (): Promise<{ 
    sources: number; 
    points: number; 
    active_points: number; 
    articles: number; 
    vectors: number; 
    schedules_active: number 
}> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/tasks/stats`);
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
export const updateGeminiCookies = (data: { secure_1psid: string; secure_1psidts: string; http_proxy?: string }): Promise<{ message: string; initialized: boolean }> => {
    // Sanitise payload to handle optional fields correctly
    const payload: any = {
        secure_1psid: data.secure_1psid,
        secure_1psidts: data.secure_1psidts,
    };
    
    if (data.http_proxy && data.http_proxy.trim() !== '') {
        payload.http_proxy = data.http_proxy.trim();
    }

    return apiFetch<{ message: string; initialized: boolean }>(`${INTELLIGENCE_SERVICE_PATH}/gemini/cookies`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export const checkGeminiCookies = (): Promise<{ has_cookie: boolean; valid: boolean }> =>
    apiFetch<{ has_cookie: boolean; valid: boolean }>(`${INTELLIGENCE_SERVICE_PATH}/gemini/cookies/check`);

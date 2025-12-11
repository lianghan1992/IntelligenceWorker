

// src/api/intelligence.ts

import { INTELSPIDER_SERVICE_PATH } from '../config';
import { apiFetch, createApiQuery } from './helper';
import { 
    SpiderSource, 
    SpiderPoint, 
    SpiderArticle,
    SpiderTaskTriggerResponse,
    PaginatedResponse,
    PendingArticle,
    IntelligencePointPublic,
    IntelligenceSourcePublic,
    ArticlePublic,
    SpiderTask,
    SpiderTaskCounts,
    SpiderTaskTypeCounts,
    PendingArticlePublic,
    IntelligenceTaskPublic,
    SpiderProxy,
    SemanticSearchRequest,
    SemanticSearchResponse,
    InfoItem,
    CreateIntelLlmTaskRequest,
    IntelLlmTask
} from '../types';

// --- Service Status ---
export const getServiceHealth = (): Promise<{ status: string }> => 
    apiFetch<{ status: string }>(`${INTELSPIDER_SERVICE_PATH}/health`);

// --- Gemini Management (IntelSpider) ---
export const checkIntelGeminiStatus = (): Promise<{ valid: boolean; message: string }> => 
    apiFetch<{ valid: boolean; message: string }>(`${INTELSPIDER_SERVICE_PATH}/gemini/cookies/check`);

export const updateIntelGeminiCookies = (data: { secure_1psid: string; secure_1psidts: string }): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/gemini/cookies/update`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

export const toggleIntelHtmlGeneration = (enabled: boolean): Promise<{ message: string; enabled: boolean }> => 
    apiFetch<{ message: string; enabled: boolean }>(`${INTELSPIDER_SERVICE_PATH}/html/generation/enable`, {
        method: 'POST',
        body: JSON.stringify({ enabled })
    });

// --- Article HTML Generation ---
export const generateArticleHtml = (articleUuid: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/articles/${articleUuid}/generate_html`, {
        method: 'POST'
    });

export const batchGenerateHtml = (data: { point_uuid?: string; force_regenerate?: boolean; limit?: number }): Promise<void> =>
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/html/batch/generate`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

export const getArticleHtml = (articleUuid: string): Promise<{ uuid: string; html_content: string }> => 
    apiFetch<{ uuid: string; html_content: string }>(`${INTELSPIDER_SERVICE_PATH}/articles/${articleUuid}/html`);

export const downloadArticlePdf = async (articleUuid: string): Promise<Blob> => {
    const url = `${INTELSPIDER_SERVICE_PATH}/articles/${articleUuid}/pdf`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    
    const response = await fetch(url, { 
        method: 'POST',
        headers 
    });
    
    if (!response.ok) {
        let errorMsg = '下载 PDF 失败';
        try {
            const errData = await response.json();
            errorMsg = errData.message || errorMsg;
        } catch(e) {}
        throw new Error(errorMsg);
    }
    return response.blob();
};

// --- Sources ---

export const getSpiderSources = async (): Promise<SpiderSource[]> => {
    // List sources: GET /intelspider/sources/
    const sources = await apiFetch<any[]>(`${INTELSPIDER_SERVICE_PATH}/sources/`);
    // Map backend UUID to frontend ID
    return sources.map((s: any) => ({
        ...s,
        id: s.uuid,
        source_name: s.name,
        points_count: s.total_points || 0,
        articles_count: s.total_articles || 0
    }));
};

export const createSpiderSource = async (data: { name: string; main_url: string }): Promise<SpiderSource> => {
    // Create source: POST /intelspider/sources/
    const res = await apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/sources/`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
    return { ...res, id: res.uuid, source_name: res.name, points_count: res.total_points, articles_count: res.total_articles };
};

// Legacy alias mapping for compatibility
export const getSources = async (): Promise<IntelligenceSourcePublic[]> => {
    const sources = await getSpiderSources();
    return sources.map((s: any) => ({ ...s, source_name: s.name }));
};

export const deleteSource = (id: string): Promise<void> => {
    // Assuming DELETE /intelspider/sources/{id} exists for management even if not in main overview
    return apiFetch(`${INTELSPIDER_SERVICE_PATH}/sources/${id}`, { method: 'DELETE' });
};

// --- Points ---

export const getSpiderPoints = async (sourceUuid?: string): Promise<SpiderPoint[]> => {
    // List points: GET /intelspider/points/ (optional ?source_uuid=...)
    const query = sourceUuid ? `?source_uuid=${sourceUuid}` : '';
    const points = await apiFetch<any[]>(`${INTELSPIDER_SERVICE_PATH}/points/${query}`);
    return points.map((p: any) => ({
        ...p,
        id: p.uuid,
        point_name: p.name,
        point_url: p.url,
        source_name: p.source_name || ''
    }));
};

export const createSpiderPoint = async (data: {
    source_uuid: string;
    name: string;
    url: string;
    cron_schedule: string;
    initial_pages?: number;
    is_active?: boolean;
}): Promise<SpiderPoint> => {
    // Create point: POST /intelspider/points/
    const res = await apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/points/`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
    return { ...res, id: res.uuid, point_name: res.name, point_url: res.url };
};

export const triggerSpiderTask = (data: { point_uuid: string; task_type?: 'initial' | 'incremental' }): Promise<SpiderTaskTriggerResponse> => {
    // Trigger task: POST /intelspider/tasks/trigger/
    return apiFetch<SpiderTaskTriggerResponse>(`${INTELSPIDER_SERVICE_PATH}/tasks/trigger/`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

// Compatibility Wrappers for Points
export const getPoints = async (params?: { source_name?: string }): Promise<IntelligencePointPublic[]> => {
    const points = await getSpiderPoints(params?.source_name);
    return points;
};

export const createPoint = (data: any): Promise<IntelligencePointPublic> => {
    return createSpiderPoint({
        source_uuid: data.source_name, // Map source_name field to source_uuid for backend
        name: data.name,
        url: data.url,
        cron_schedule: data.cron_schedule,
        initial_pages: data.initial_pages,
        is_active: true
    });
};

export const deletePoints = (ids: string[]): Promise<void> => {
    // Assuming DELETE /intelspider/points/{id} exists
    return Promise.all(ids.map(id => apiFetch(`${INTELSPIDER_SERVICE_PATH}/points/${id}`, { method: 'DELETE' }))).then(() => {});
};

export const togglePoint = (id: string, isActive: boolean): Promise<void> => {
    // Assuming PATCH or similar exists to update status
    return apiFetch(`${INTELSPIDER_SERVICE_PATH}/points/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: isActive })
    });
};

export const runPoint = (id: string): Promise<any> => {
    return triggerSpiderTask({ point_uuid: id, task_type: 'incremental' });
};

// --- Articles ---

export const getSpiderArticles = async (params?: any): Promise<PaginatedResponse<SpiderArticle>> => {
    // List articles: GET /intelspider/articles/
    const query = createApiQuery(params);
    const res = await apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/articles/${query}`);
    
    // Map response to match SpiderArticle type
    const items = (res.items || []).map((a: any) => ({
        ...a,
        id: a.uuid, // Ensure ID alias
        publish_time: a.publish_date, // Map to old name for compatibility if needed
        collected_at: a.created_at || a.collected_at,
        source_name: a.source_name || 'Unknown',
        point_name: a.point_name || 'Unknown'
    }));

    return {
        ...res,
        items
    };
};

export const getSpiderArticleDetail = async (uuid: string): Promise<SpiderArticle> => {
    // Get single article detail: GET /intelspider/articles/{article_uuid}
    const res = await apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/articles/${uuid}`);
    return {
        ...res,
        id: res.uuid,
        publish_time: res.publish_date,
        collected_at: res.created_at || res.collected_at
    };
};

export const deleteSpiderArticle = (uuid: string): Promise<void> => {
    // Delete single article: DELETE /intelspider/articles/{article_uuid}
    return apiFetch(`${INTELSPIDER_SERVICE_PATH}/articles/${uuid}`, { method: 'DELETE' });
};

export const getArticleById = (articleUuid: string): Promise<ArticlePublic> =>
    getSpiderArticleDetail(articleUuid).then(a => ({
        ...a,
        source_name: a.source_name || 'Unknown',
        point_name: a.point_name || 'Unknown'
    }));

export const getArticles = (params: any): Promise<PaginatedResponse<ArticlePublic>> => {
    return searchArticlesFiltered(params);
};

export const getSpiderPendingArticles = (): Promise<PendingArticle[]> => {
    return apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/articles/pending`).then((res: any) => {
        const items = Array.isArray(res) ? res : res.items || [];
        return items.map((a: any) => ({
            ...a,
            source_name: a.source_name || 'Unknown',
            point_name: a.point_name || 'Unknown',
            created_at: a.collected_at
        }));
    });
};

export const getPendingArticles = async (params: any): Promise<PaginatedResponse<PendingArticlePublic>> => {
     const query = createApiQuery(params);
     const res = await apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/articles/pending${query}`);
     const items = (res.items || []).map((a: any) => ({
         ...a,
         source_name: a.source_name || 'Unknown',
         point_name: a.point_name || 'Unknown',
         created_at: a.collected_at
     }));
     return {
         items,
         total: res.total || items.length,
         page: res.page || 1,
         limit: res.limit || 20,
         totalPages: res.totalPages || 1
     };
}

export const approveSpiderArticles = (ids: string[]): Promise<{ ok: boolean; processed: number }> => {
    return apiFetch(`${INTELSPIDER_SERVICE_PATH}/articles/approve`, {
        method: 'POST',
        body: JSON.stringify({ ids })
    });
};

export const confirmPendingArticles = approveSpiderArticles; 

export const rejectPendingArticles = (ids: string[]): Promise<{ ok: boolean }> => {
    return apiFetch(`${INTELSPIDER_SERVICE_PATH}/articles/reject`, {
        method: 'POST',
        body: JSON.stringify({ ids })
    });
};

// --- Semantic Search ---

export const searchSemanticSegments = async (params: SemanticSearchRequest): Promise<PaginatedResponse<InfoItem>> => {
    // FIX: Backend strictly requires query_text, page, page_size, similarity_threshold in URL query params.
    const searchParams = new URLSearchParams();
    searchParams.append('query_text', params.query_text);
    if (params.page) searchParams.append('page', String(params.page));
    if (params.page_size) searchParams.append('page_size', String(params.page_size));
    
    // Add these to URL params as per successful curl example from backend team
    if (params.similarity_threshold !== undefined) searchParams.append('similarity_threshold', String(params.similarity_threshold));
    if (params.max_segments !== undefined) searchParams.append('max_segments', String(params.max_segments));
    
    const queryStr = `?${searchParams.toString()}`;
    
    // Optional filters in body
    const body = {
        source_uuid: params.source_uuid,
        point_uuid: params.point_uuid,
        start_date: params.start_date,
        end_date: params.end_date,
        // similarity_threshold and max_segments moved to query params
    };

    const res = await apiFetch<SemanticSearchResponse>(`${INTELSPIDER_SERVICE_PATH}/search/semantic${queryStr}`, {
        method: 'POST',
        body: JSON.stringify(body)
    });

    const items: InfoItem[] = res.items.map(item => ({
        id: item.article_id,
        title: item.title,
        content: item.content,
        source_name: item.source_name,
        original_url: '', // Semantic segment doesn't always return URL directly, fetch detail if needed
        publish_date: item.publish_date,
        created_at: item.publish_date, // Fallback
        similarity: item.similarity
    }));

    return {
        items,
        total: res.total_segments,
        page: params.page || 1,
        limit: params.page_size || 20,
        totalPages: Math.ceil(res.total_segments / (params.page_size || 20)) || 1
    };
};

// --- LLM Intelligence Tasks ---

export const createIntelLlmTask = async (data: CreateIntelLlmTaskRequest): Promise<IntelLlmTask> => {
    return apiFetch<IntelLlmTask>(`${INTELSPIDER_SERVICE_PATH}/llm/tasks`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const getIntelLlmTask = async (taskUuid: string): Promise<IntelLlmTask> => {
    return apiFetch<IntelLlmTask>(`${INTELSPIDER_SERVICE_PATH}/llm/tasks/${taskUuid}`);
};

// Assuming a list endpoint exists based on standard patterns, similar to other modules
export const getIntelLlmTasks = async (params: any = {}): Promise<PaginatedResponse<IntelLlmTask>> => {
    const query = createApiQuery(params);
    const res = await apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/llm/tasks${query}`);
    return {
        items: res.items || res, // Handle if it returns array directly or paginated object
        total: res.total || (Array.isArray(res) ? res.length : 0),
        page: params.page || 1,
        limit: params.page_size || 20,
        totalPages: res.totalPages || 1
    };
};

export const downloadIntelLlmTaskReport = async (taskUuid: string): Promise<Blob> => {
    const url = `${INTELSPIDER_SERVICE_PATH}/llm/tasks/${taskUuid}/download`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('下载报告失败');
    return response.blob();
};

// --- Proxies ---

export const getProxies = (): Promise<SpiderProxy[]> => 
    apiFetch<SpiderProxy[]>(`${INTELSPIDER_SERVICE_PATH}/proxies/`);

export const addProxy = (data: { url: string; enabled: boolean; note?: string }): Promise<SpiderProxy> => 
    apiFetch<SpiderProxy>(`${INTELSPIDER_SERVICE_PATH}/proxies/`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

export const updateProxy = (url: string, data: Partial<SpiderProxy>): Promise<SpiderProxy> => 
    apiFetch<SpiderProxy>(`${INTELSPIDER_SERVICE_PATH}/proxies/${encodeURIComponent(url)}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });

export const deleteProxy = (url: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/proxies/${encodeURIComponent(url)}`, {
        method: 'DELETE'
    });

export const testProxy = (url: string): Promise<{ success: boolean; latency_ms?: number; error?: string }> => 
    apiFetch(`${INTELSPIDER_SERVICE_PATH}/proxies/test`, {
        method: 'POST',
        body: JSON.stringify({ url })
    });

// --- Tasks (Monitoring) ---

export const getSpiderTasks = async (params?: any): Promise<PaginatedResponse<SpiderTask>> => {
    const query = createApiQuery(params);
    // GET /intelspider/tasks/ with pagination support
    const res = await apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/tasks/${query}`);
    // Map UUID to ID if needed
    const items = (res.items || []).map((t: any) => ({
        ...t,
        id: t.uuid,
        start_time: t.start_time,
        end_time: t.end_time
    }));
    return {
        ...res,
        items
    };
};

export const getTasks = async (params: any): Promise<{items: IntelligenceTaskPublic[], total: number}> => {
    const res = await getSpiderTasks(params);
    return { items: res.items, total: res.total };
}

export const getSpiderPointTasks = (pointId: string, params?: any): Promise<{ items: SpiderTask[], total: number, counts: SpiderTaskCounts, type_counts: SpiderTaskTypeCounts }> => {
    const query = createApiQuery(params);
    // Assuming GET /intelspider/points/{pointId}/tasks
    return apiFetch(`${INTELSPIDER_SERVICE_PATH}/points/${pointId}/tasks${query}`);
};


// --- Legacy Compatibility Functions ---

export const getIntelligenceStats = (): Promise<any> =>
    Promise.resolve({ sources: 0, points: 0, articles: 0 });

export const searchArticlesFiltered = async (params: any): Promise<PaginatedResponse<ArticlePublic>> => {
    try {
        const res = await getSpiderArticles({
            page: params.page,
            limit: params.limit,
            // Map legacy query_text to nothing for now, or point_uuid if supported
        });
        
        return res as PaginatedResponse<ArticlePublic>;
    } catch (e) {
        return { items: [], total: 0, page: 1, limit: 10, totalPages: 0 };
    }
};

export const deleteArticles = (ids: string[]): Promise<void> => Promise.resolve();
export const searchChunks = (params: any): Promise<any> => Promise.resolve({ results: [] });
export const exportChunks = (params: any): Promise<any> => Promise.resolve({ export_data: [] });
export const createLlmSearchTask = (data: any): Promise<any> => Promise.resolve({});
export const getLlmSearchTasks = (params: any): Promise<any> => Promise.resolve({ items: [] });
// Use specific functions for Gemini cookie updates
export const updateGeminiCookies = (data: any): Promise<any> => Promise.resolve({});
export const checkGeminiCookies = (): Promise<any> => Promise.resolve({ has_cookie: false });
export const toggleHtmlGeneration = (enable: boolean): Promise<any> => Promise.resolve({});
export const createGenericPoint = (data: any): Promise<any> => Promise.resolve({});
export const updateGenericPoint = (id: string, data: any): Promise<any> => Promise.resolve({});
export const getSourcesAndPoints = (): Promise<any[]> => Promise.resolve([]);
export const getGenericTasks = (params: any): Promise<any> => Promise.resolve({ items: [] });
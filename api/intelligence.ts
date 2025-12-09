// src/api/intelligence.ts

import { API_BASE_URL } from '../config';
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
    IntelligenceTaskPublic
} from '../types';

// Updated service base path
const INTELSPIDER_PATH = `${API_BASE_URL}/intelspider`; 

// --- Service Status ---
export const getServiceHealth = (): Promise<{ status: string }> => 
    apiFetch<{ status: string }>(`${INTELSPIDER_PATH}/health`);

// --- Sources ---

export const getSpiderSources = async (): Promise<SpiderSource[]> => {
    // List sources
    const sources = await apiFetch<any[]>(`${INTELSPIDER_PATH}/sources/`);
    // Map backend UUID to frontend ID
    return sources.map(s => ({
        ...s,
        id: s.uuid,
        source_name: s.name,
        points_count: s.total_points || 0,
        articles_count: s.total_articles || 0
    }));
};

export const createSpiderSource = async (data: { name: string; main_url: string }): Promise<SpiderSource> => {
    const res = await apiFetch<any>(`${INTELSPIDER_PATH}/sources/`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
    return { ...res, id: res.uuid, source_name: res.name, points_count: res.total_points, articles_count: res.total_articles };
};

// Legacy alias mapping for compatibility
export const getSources = async (): Promise<IntelligenceSourcePublic[]> => {
    const sources = await getSpiderSources();
    return sources.map(s => ({ ...s, source_name: s.name }));
};

export const deleteSource = (id: string): Promise<void> => {
    return apiFetch(`${INTELSPIDER_PATH}/sources/${id}`, { method: 'DELETE' });
};

// --- Points ---

export const getSpiderPoints = async (sourceUuid?: string): Promise<SpiderPoint[]> => {
    // Backend likely supports filtering by source_uuid if passed
    // Assuming RESTful listing at /points/ or /points/?source_uuid=...
    const query = sourceUuid ? `?source_uuid=${sourceUuid}` : '';
    const points = await apiFetch<any[]>(`${INTELSPIDER_PATH}/points/${query}`);
    return points.map(p => ({
        ...p,
        id: p.uuid,
        point_name: p.name,
        point_url: p.url,
        // Ensure source_name is available or handled in UI via source lookups
        source_name: p.source_name 
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
    const res = await apiFetch<any>(`${INTELSPIDER_PATH}/points/`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
    return { ...res, id: res.uuid, point_name: res.name, point_url: res.url };
};

export const triggerSpiderTask = (data: { point_uuid: string; task_type?: 'initial' | 'incremental' }): Promise<SpiderTaskTriggerResponse> => {
    return apiFetch<SpiderTaskTriggerResponse>(`${INTELSPIDER_PATH}/tasks/trigger/`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

// Compatibility Wrappers for Points
export const getPoints = async (params?: { source_name?: string }): Promise<IntelligencePointPublic[]> => {
    // Note: params.source_name might be an ID or Name depending on legacy usage.
    // Ideally we fetch all or filter by ID. 
    // Since this is a shim, we fetch all and filter in memory if needed, or pass query.
    const points = await getSpiderPoints();
    if (params?.source_name) {
        // legacy might pass name or id. For strictness, let's assume UI uses IDs now as per previous refactor
        return points.filter(p => p.source_uuid === params.source_name || p.source_name === params.source_name);
    }
    return points;
};

export const createPoint = (data: any): Promise<IntelligencePointPublic> => {
    return createSpiderPoint({
        source_uuid: data.source_name, // The UI form passes the Source UUID in the 'source_name' field for compatibility
        name: data.name,
        url: data.url,
        cron_schedule: data.cron_schedule,
        initial_pages: data.initial_pages,
        is_active: true
    });
};

export const deletePoints = (ids: string[]): Promise<void> => {
    return Promise.all(ids.map(id => apiFetch(`${INTELSPIDER_PATH}/points/${id}`, { method: 'DELETE' }))).then(() => {});
};

export const togglePoint = (id: string, isActive: boolean): Promise<void> => {
    return apiFetch(`${INTELSPIDER_PATH}/points/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: isActive })
    });
};

export const runPoint = (id: string): Promise<any> => {
    return triggerSpiderTask({ point_uuid: id, task_type: 'incremental' });
};

// --- Articles (Assuming standard REST endpoints exist for data consumption) ---

export const getSpiderArticles = async (params?: any): Promise<PaginatedResponse<SpiderArticle>> => {
    const query = createApiQuery(params);
    return apiFetch<PaginatedResponse<SpiderArticle>>(`${INTELSPIDER_PATH}/articles/${query}`);
};

export const getArticles = (params: any): Promise<PaginatedResponse<ArticlePublic>> => {
    return searchArticlesFiltered(params);
};

export const getSpiderPendingArticles = (): Promise<PendingArticle[]> => {
    return apiFetch<any>(`${INTELSPIDER_PATH}/articles/pending`).then(res => {
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
     const res = await apiFetch<any>(`${INTELSPIDER_PATH}/articles/pending${query}`);
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
    return apiFetch(`${INTELSPIDER_PATH}/articles/approve`, {
        method: 'POST',
        body: JSON.stringify({ ids })
    });
};

export const confirmPendingArticles = approveSpiderArticles; 

export const rejectPendingArticles = (ids: string[]): Promise<{ ok: boolean }> => {
    return apiFetch(`${INTELSPIDER_PATH}/articles/reject`, {
        method: 'POST',
        body: JSON.stringify({ ids })
    });
};

// --- Tasks (Monitoring) ---

export const getSpiderTasks = (params?: any): Promise<SpiderTask[]> => {
    const query = createApiQuery(params);
    return apiFetch<SpiderTask[]>(`${INTELSPIDER_PATH}/tasks/${query}`);
};

export const getTasks = async (params: any): Promise<{items: IntelligenceTaskPublic[], total: number}> => {
    const tasks = await getSpiderTasks(params);
    return { items: tasks, total: tasks.length };
}

export const getSpiderPointTasks = (pointId: string, params?: any): Promise<{ items: SpiderTask[], total: number, counts: SpiderTaskCounts, type_counts: SpiderTaskTypeCounts }> => {
    const query = createApiQuery(params);
    return apiFetch(`${INTELSPIDER_PATH}/points/${pointId}/tasks${query}`);
};


// --- Legacy Compatibility Functions ---

export const getIntelligenceStats = (): Promise<any> =>
    Promise.resolve({ sources: 0, points: 0, articles: 0 });

export const searchArticlesFiltered = async (params: any): Promise<PaginatedResponse<ArticlePublic>> => {
    try {
        const res = await getSpiderArticles({
            page: params.page,
            limit: params.limit,
            query: params.query_text // pass search term
        });
        
        const items = res.items.map(a => ({
            ...a,
            source_name: 'Intelligence Source',
            point_name: 'Intelligence Point',
            publish_date: a.publish_time || a.collected_at,
            created_at: a.collected_at
        }));

        return {
            items,
            total: res.total,
            page: res.page,
            limit: res.limit,
            totalPages: res.totalPages
        };
    } catch (e) {
        return { items: [], total: 0, page: 1, limit: 10, totalPages: 0 };
    }
};

export const getArticleById = (id: string): Promise<ArticlePublic> =>
    apiFetch(`${INTELSPIDER_PATH}/articles/${id}`);

export const deleteArticles = (ids: string[]): Promise<void> => Promise.resolve();
export const searchChunks = (params: any): Promise<any> => Promise.resolve({ results: [] });
export const exportChunks = (params: any): Promise<any> => Promise.resolve({ export_data: [] });
export const createLlmSearchTask = (data: any): Promise<any> => Promise.resolve({});
export const getLlmSearchTasks = (params: any): Promise<any> => Promise.resolve({ items: [] });
export const updateGeminiCookies = (data: any): Promise<any> => Promise.resolve({});
export const checkGeminiCookies = (): Promise<any> => Promise.resolve({ has_cookie: false });
export const toggleHtmlGeneration = (enable: boolean): Promise<any> => Promise.resolve({});
export const createGenericPoint = (data: any): Promise<any> => Promise.resolve({});
export const updateGenericPoint = (id: string, data: any): Promise<any> => Promise.resolve({});
export const getSourcesAndPoints = (): Promise<any[]> => Promise.resolve([]);
export const getGenericTasks = (params: any): Promise<any> => Promise.resolve({ items: [] });

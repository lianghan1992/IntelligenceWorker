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
    IntelligenceTaskPublic
} from '../types';

// --- Service Status ---
export const getServiceHealth = (): Promise<{ status: string }> => 
    apiFetch<{ status: string }>(`${INTELSPIDER_SERVICE_PATH}/health`);

// --- Sources ---

export const getSpiderSources = async (): Promise<SpiderSource[]> => {
    // List sources: GET /intelspider/sources/
    const sources = await apiFetch<any[]>(`${INTELSPIDER_SERVICE_PATH}/sources/`);
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
    return sources.map(s => ({ ...s, source_name: s.name }));
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
    return points.map(p => ({
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
    return apiFetch<PaginatedResponse<SpiderArticle>>(`${INTELSPIDER_SERVICE_PATH}/articles/${query}`);
};

export const getArticleById = (articleUuid: string): Promise<ArticlePublic> =>
    apiFetch(`${INTELSPIDER_SERVICE_PATH}/articles/${articleUuid}`);

export const getArticles = (params: any): Promise<PaginatedResponse<ArticlePublic>> => {
    return searchArticlesFiltered(params);
};

export const getSpiderPendingArticles = (): Promise<PendingArticle[]> => {
    return apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/articles/pending`).then(res => {
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

// --- Tasks (Monitoring) ---

export const getSpiderTasks = (params?: any): Promise<SpiderTask[]> => {
    const query = createApiQuery(params);
    // Assuming GET /intelspider/tasks/ for full monitoring list
    return apiFetch<SpiderTask[]>(`${INTELSPIDER_SERVICE_PATH}/tasks/${query}`);
};

export const getTasks = async (params: any): Promise<{items: IntelligenceTaskPublic[], total: number}> => {
    const tasks = await getSpiderTasks(params);
    return { items: tasks, total: tasks.length };
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
        
        const items = res.items.map(a => ({
            ...a,
            source_name: 'Intelligence Source', // Placeholder until hydrated
            point_name: 'Intelligence Point', // Placeholder until hydrated
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
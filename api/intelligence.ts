import { INTELSPIDER_SERVICE_PATH } from '../config';
import { apiFetch, createApiQuery } from './helper';
import { 
    SpiderSource, SpiderPoint, IntelligencePointPublic, InfoItem, 
    PaginatedResponse, SpiderArticle, SearchChunkResult, 
    LlmSearchTaskItem, GenericPoint, GenericTask,
    PendingArticle, IntelligenceTaskPublic, SpiderTask, IntelLlmTask,
    AnalysisTemplate, AnalysisResult, UploadedDocument, DocTag,
    SpiderProxy, IntelligenceSourcePublic
} from '../types';

// Sources
export const getSources = (): Promise<IntelligenceSourcePublic[]> => getSpiderSources().then(res => res.map(s => ({
    id: s.uuid,
    uuid: s.uuid,
    name: s.name,
    source_name: s.name,
    main_url: s.main_url,
    total_points: 0,
    total_articles: 0,
    points_count: 0,
    articles_count: 0,
    created_at: '',
    updated_at: ''
})));

export const getSpiderSources = (): Promise<SpiderSource[]> => 
    apiFetch<SpiderSource[]>(`${INTELSPIDER_SERVICE_PATH}/sources`);

export const createSpiderSource = (data: { name: string; main_url: string }): Promise<SpiderSource> => 
    apiFetch<SpiderSource>(`${INTELSPIDER_SERVICE_PATH}/sources`, { method: 'POST', body: JSON.stringify(data) });

export const deleteSource = (uuid: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/sources/${uuid}`, { method: 'DELETE' });

// Points
export const getPoints = (params?: { source_name?: string }): Promise<IntelligencePointPublic[]> => {
    // Legacy support: params.source_name is effectively source_uuid in current context
    const sourceId = params?.source_name;
    if (!sourceId) return Promise.resolve([]);
    return getSpiderPoints(sourceId).then(res => res.map(p => ({
        id: p.uuid,
        uuid: p.uuid,
        source_uuid: p.source_uuid,
        source_name: p.source_name,
        name: p.name,
        url: p.url,
        point_name: p.name,
        point_url: p.url,
        cron_schedule: p.cron_schedule,
        is_active: p.is_active,
        url_filters: [], 
        extra_hint: '',
        created_at: '',
        updated_at: '',
        status: p.is_active ? 'active' : 'inactive',
        initial_pages: p.initial_pages
    })));
};

export const getSpiderPoints = (sourceUuid: string): Promise<SpiderPoint[]> => 
    apiFetch<SpiderPoint[]>(`${INTELSPIDER_SERVICE_PATH}/sources/${sourceUuid}/points`);

export const createPoint = (data: any): Promise<void> => createSpiderPoint({
    source_uuid: data.source_name, // Map UI field to API field
    name: data.name,
    url: data.url,
    cron_schedule: data.cron_schedule,
    initial_pages: data.initial_pages,
    is_active: true
}).then(() => {});

export const createSpiderPoint = (data: any): Promise<SpiderPoint> => 
    apiFetch<SpiderPoint>(`${INTELSPIDER_SERVICE_PATH}/points`, { method: 'POST', body: JSON.stringify(data) });

export const updateSpiderPoint = (uuid: string, data: any): Promise<SpiderPoint> => 
    apiFetch<SpiderPoint>(`${INTELSPIDER_SERVICE_PATH}/points/${uuid}`, { method: 'PUT', body: JSON.stringify(data) });

export const deletePoints = (ids: string[]): Promise<void> => Promise.all(ids.map(id => deleteSpiderPoint(id))).then(() => {});

export const deleteSpiderPoint = (uuid: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/points/${uuid}`, { method: 'DELETE' });

export const togglePoint = (uuid: string, isActive: boolean): Promise<void> => 
    updateSpiderPoint(uuid, { is_active: isActive }).then(() => {});

export const runPoint = (uuid: string): Promise<void> => triggerSpiderTask({ point_uuid: uuid, task_type: 'initial' });

export const disableSpiderPoint = (uuid: string) => togglePoint(uuid, false);
export const enableSpiderPoint = (uuid: string) => togglePoint(uuid, true);

// Tasks
export const triggerSpiderTask = (data: { point_uuid: string; task_type: 'initial' | 'incremental' }): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/tasks/trigger`, { method: 'POST', body: JSON.stringify(data) });

export const getTasks = (params: any): Promise<PaginatedResponse<IntelligenceTaskPublic>> => getSpiderTasks(params);

export const getSpiderTasks = (params?: any): Promise<PaginatedResponse<IntelligenceTaskPublic>> => {
    const query = createApiQuery(params);
    return apiFetch<PaginatedResponse<IntelligenceTaskPublic>>(`${INTELSPIDER_SERVICE_PATH}/tasks${query}`);
}

export const getSpiderPointTasks = (pointUuid: string, params?: any): Promise<any> => {
    const query = createApiQuery(params);
    return apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/points/${pointUuid}/tasks${query}`);
}

// Articles
export const getArticles = (params: any): Promise<PaginatedResponse<InfoItem>> => {
    return getSpiderArticles(params).then(res => ({
        ...res,
        items: res.items.map(a => ({
            id: a.id,
            title: a.title,
            content: a.content,
            source_name: a.source_name,
            point_name: a.point_name,
            original_url: a.url,
            publish_date: a.publish_date,
            created_at: a.created_at,
            is_atomized: a.is_atomized,
            tags: a.tags
        }))
    }));
}

export const getSpiderArticles = (params: any): Promise<PaginatedResponse<SpiderArticle>> => {
    const query = createApiQuery(params);
    return apiFetch<PaginatedResponse<SpiderArticle>>(`${INTELSPIDER_SERVICE_PATH}/articles${query}`);
}

export const getArticleById = (id: string): Promise<InfoItem> => getSpiderArticleDetail(id).then(a => ({
    id: a.id,
    title: a.title,
    content: a.content,
    source_name: a.source_name,
    point_name: a.point_name,
    original_url: a.url,
    publish_date: a.publish_date,
    created_at: a.created_at,
    is_atomized: a.is_atomized,
    tags: a.tags
}));

export const getSpiderArticleDetail = (uuid: string): Promise<SpiderArticle> => 
    apiFetch<SpiderArticle>(`${INTELSPIDER_SERVICE_PATH}/articles/${uuid}`);

export const deleteArticles = (ids: string[]): Promise<void> => Promise.all(ids.map(id => deleteSpiderArticle(id))).then(() => {});

export const deleteSpiderArticle = (uuid: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/articles/${uuid}`, { method: 'DELETE' });

export const getTodayArticleCount = (): Promise<{ count: number }> => 
    apiFetch<{ count: number }>(`${INTELSPIDER_SERVICE_PATH}/articles/stats/today`);

// Search
export const searchArticlesFiltered = (params: any): Promise<PaginatedResponse<InfoItem>> => getArticles(params); 

export const searchSemanticSegments = (data: any): Promise<{ items: InfoItem[], total: number }> => 
    apiFetch<{ items: InfoItem[], total: number }>(`${INTELSPIDER_SERVICE_PATH}/search/semantic`, { method: 'POST', body: JSON.stringify(data) });

export const getArticlesByTags = (data: any): Promise<PaginatedResponse<InfoItem>> => 
    apiFetch<PaginatedResponse<InfoItem>>(`${INTELSPIDER_SERVICE_PATH}/search/tags`, { method: 'POST', body: JSON.stringify(data) });

export const searchChunks = (data: any): Promise<{ results: SearchChunkResult[] }> => 
    apiFetch<{ results: SearchChunkResult[] }>(`${INTELSPIDER_SERVICE_PATH}/search/chunks`, { method: 'POST', body: JSON.stringify(data) });

export const exportChunks = (data: any): Promise<{ export_data: any }> => 
    apiFetch<{ export_data: any }>(`${INTELSPIDER_SERVICE_PATH}/search/chunks/export`, { method: 'POST', body: JSON.stringify(data) });

// HTML & PDF
export const getArticleHtml = (uuid: string): Promise<{ html_content: string }> => 
    apiFetch<{ html_content: string }>(`${INTELSPIDER_SERVICE_PATH}/articles/${uuid}/html`);

export const generateArticleHtml = (uuid: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/articles/${uuid}/html/generate`, { method: 'POST' });

export const downloadArticlePdf = async (uuid: string): Promise<Blob> => {
    const url = `${INTELSPIDER_SERVICE_PATH}/articles/${uuid}/pdf/download`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Download failed');
    return response.blob();
}

// LLM Sorting
export const createLlmSearchTask = (data: { query_text: string }): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/llm_search/tasks`, { method: 'POST', body: JSON.stringify(data) });

export const getLlmSearchTasks = (params: any): Promise<{ items: LlmSearchTaskItem[] }> => {
    const query = createApiQuery(params);
    return apiFetch<{ items: LlmSearchTaskItem[] }>(`${INTELSPIDER_SERVICE_PATH}/llm_search/tasks${query}`);
}

// Gemini Settings
export const updateGeminiCookies = (data: any): Promise<any> => updateIntelGeminiCookies(data);
export const checkGeminiCookies = (): Promise<any> => checkIntelGeminiStatus();
export const toggleHtmlGeneration = (enabled: boolean): Promise<any> => toggleIntelHtmlGeneration(enabled);

export const updateIntelGeminiCookies = (data: any): Promise<any> => 
    apiFetch(`${INTELSPIDER_SERVICE_PATH}/gemini/cookies`, { method: 'PUT', body: JSON.stringify(data) });

export const checkIntelGeminiStatus = (): Promise<{ valid: boolean; message: string }> => 
    apiFetch(`${INTELSPIDER_SERVICE_PATH}/gemini/status`);

export const toggleIntelHtmlGeneration = (enabled: boolean): Promise<{ message: string }> => 
    apiFetch(`${INTELSPIDER_SERVICE_PATH}/gemini/html_gen/toggle`, { method: 'POST', body: JSON.stringify({ enabled }) });

export const toggleRetrospectiveHtmlGeneration = (enabled: boolean): Promise<{ message: string }> => 
    apiFetch(`${INTELSPIDER_SERVICE_PATH}/gemini/retro_html_gen/toggle`, { method: 'POST', body: JSON.stringify({ enabled }) });

// Generic Crawler
export const createGenericPoint = (data: any): Promise<void> => createSpiderPoint({ ...data, mode: 'generic' }).then(() => {});
export const updateGenericPoint = (uuid: string, data: any): Promise<void> => updateSpiderPoint(uuid, data).then(() => {});
export const getSourcesAndPoints = (): Promise<any[]> => getSources().then(async sources => {
    const sourcesWithPoints = await Promise.all(sources.map(async s => {
        const points = await getSpiderPoints(s.uuid);
        return { ...s, points };
    }));
    return sourcesWithPoints;
});
export const getGenericTasks = (params: any): Promise<any> => getSpiderTasks(params);

// Pending Articles
export const getPendingArticles = (params: any): Promise<PaginatedResponse<PendingArticle>> => getSpiderPendingArticles(params);

export const getSpiderPendingArticles = (params?: any): Promise<PaginatedResponse<PendingArticle>> => {
    const query = createApiQuery(params);
    return apiFetch<PaginatedResponse<PendingArticle>>(`${INTELSPIDER_SERVICE_PATH}/articles/pending${query}`);
}

export const confirmPendingArticles = (ids: string[]): Promise<void> => approveSpiderArticles(ids).then(() => {});
export const rejectPendingArticles = (ids: string[]): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/articles/pending/reject`, { method: 'POST', body: JSON.stringify({ ids }) });

export const approveSpiderArticles = (ids: string[]): Promise<{ ok: boolean; processed: number }> => 
    apiFetch<{ ok: boolean; processed: number }>(`${INTELSPIDER_SERVICE_PATH}/articles/pending/approve`, { method: 'POST', body: JSON.stringify({ ids }) });

// Intel LLM Analysis Tasks
export const createIntelLlmTask = (data: any): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/analysis/tasks`, { method: 'POST', body: JSON.stringify(data) });

export const getIntelLlmTasks = (params: any): Promise<{ items: IntelLlmTask[] }> => {
    const query = createApiQuery(params);
    return apiFetch<{ items: IntelLlmTask[] }>(`${INTELSPIDER_SERVICE_PATH}/analysis/tasks${query}`);
}

export const downloadIntelLlmTaskReport = async (uuid: string): Promise<Blob> => {
    const url = `${INTELSPIDER_SERVICE_PATH}/analysis/tasks/${uuid}/report`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Download failed');
    return response.blob();
}

// Stats
export const getIntelligenceStats = (): Promise<any> => 
    apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/stats/overview`);

// Analysis Templates
export const createAnalysisTemplate = (data: any): Promise<AnalysisTemplate> => 
    apiFetch<AnalysisTemplate>(`${INTELSPIDER_SERVICE_PATH}/analysis/templates`, { method: 'POST', body: JSON.stringify(data) });

export const getAnalysisTemplates = (params: any): Promise<AnalysisTemplate[]> => {
    const query = createApiQuery(params);
    return apiFetch<AnalysisTemplate[]>(`${INTELSPIDER_SERVICE_PATH}/analysis/templates${query}`);
}

export const updateAnalysisTemplate = (uuid: string, data: any): Promise<AnalysisTemplate> => 
    apiFetch<AnalysisTemplate>(`${INTELSPIDER_SERVICE_PATH}/analysis/templates/${uuid}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteAnalysisTemplate = (uuid: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/analysis/templates/${uuid}`, { method: 'DELETE' });

export const getAnalysisResults = (params: any): Promise<AnalysisResult[]> => {
    const query = createApiQuery(params);
    return apiFetch<AnalysisResult[]>(`${INTELSPIDER_SERVICE_PATH}/analysis/results${query}`);
}

export const triggerAnalysis = (articleUuid: string, templateUuid?: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/analysis/trigger`, { method: 'POST', body: JSON.stringify({ article_uuid: articleUuid, template_uuid: templateUuid }) });

// Document Management
export const getUploadedDocs = (params: any): Promise<PaginatedResponse<UploadedDocument>> => {
    const query = createApiQuery(params);
    return apiFetch<PaginatedResponse<UploadedDocument>>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs${query}`);
}

export const uploadDocs = (data: { files: File[], point_uuid: string, publish_date?: string }): Promise<void> => {
    const formData = new FormData();
    data.files.forEach(f => formData.append('files', f));
    formData.append('point_uuid', data.point_uuid);
    if (data.publish_date) formData.append('publish_date', data.publish_date);
    return apiFetch(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs`, { method: 'POST', body: formData });
}

export const deleteUploadedDoc = (uuid: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/${uuid}`, { method: 'DELETE' });

export const downloadUploadedDoc = async (uuid: string): Promise<Blob> => {
    const url = `${INTELSPIDER_SERVICE_PATH}/uploaded-docs/${uuid}/download`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Download failed');
    return response.blob();
}

export const getDocPreview = async (uuid: string, page: number): Promise<Blob> => {
    const url = `${INTELSPIDER_SERVICE_PATH}/uploaded-docs/${uuid}/preview/${page}`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Preview failed');
    return response.blob();
}

export const getDocTags = (): Promise<DocTag[]> => 
    apiFetch<DocTag[]>(`${INTELSPIDER_SERVICE_PATH}/doc-tags`);

export const createDocTag = (name: string): Promise<DocTag> => 
    apiFetch<DocTag>(`${INTELSPIDER_SERVICE_PATH}/doc-tags`, { method: 'POST', body: JSON.stringify({ name }) });

export const updateDocTag = (uuid: string, name: string): Promise<DocTag> => 
    apiFetch<DocTag>(`${INTELSPIDER_SERVICE_PATH}/doc-tags/${uuid}`, { method: 'PUT', body: JSON.stringify({ name }) });

export const deleteDocTag = (uuid: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/doc-tags/${uuid}`, { method: 'DELETE' });

export const batchUpdateDocsPoint = (data: { old_point_uuid: string, new_point_uuid: string }): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/batch-move`, { method: 'POST', body: JSON.stringify(data) });

// Service Health & Proxies
export const getServiceHealth = (): Promise<{ status: string }> => 
    apiFetch<{ status: string }>(`${INTELSPIDER_SERVICE_PATH}/health`);

export const getProxies = (): Promise<SpiderProxy[]> => 
    apiFetch<SpiderProxy[]>(`${INTELSPIDER_SERVICE_PATH}/proxies`);

export const addProxy = (data: { url: string, enabled: boolean }): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/proxies`, { method: 'POST', body: JSON.stringify(data) });

export const deleteProxy = (url: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/proxies`, { method: 'DELETE', body: JSON.stringify({ url }) });

export const testProxy = (url: string): Promise<{ success: boolean; latency_ms: number }> => 
    apiFetch<{ success: boolean; latency_ms: number }>(`${INTELSPIDER_SERVICE_PATH}/proxies/test`, { method: 'POST', body: JSON.stringify({ url }) });

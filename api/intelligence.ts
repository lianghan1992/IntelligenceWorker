
import { INTELSPIDER_SERVICE_PATH } from '../config';
import { apiFetch, createApiQuery } from './helper';
import { 
    SpiderSource, SpiderPoint, IntelligencePointPublic, InfoItem, 
    PaginatedResponse, SpiderArticle, SearchChunkResult, 
    LlmSearchTaskItem, GenericPoint, GenericTask,
    PendingArticle, IntelligenceTaskPublic, SpiderTask, IntelLlmTask,
    AnalysisTemplate, AnalysisResult, UploadedDocument, DocTag,
    SpiderProxy, IntelligenceSourcePublic, ArticlePublic
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
    source_uuid: data.source_name,
    name: data.name,
    url: data.url,
    cron_schedule: data.cron_schedule,
    initial_pages: data.initial_pages,
    is_active: true
}).then(() => {});

export const createSpiderPoint = (data: any): Promise<SpiderPoint> => 
    apiFetch<SpiderPoint>(`${INTELSPIDER_SERVICE_PATH}/points`, { method: 'POST', body: JSON.stringify(data) });

export const updateSpiderPoint = (uuid: string, data: any): Promise<SpiderPoint> => 
    apiFetch<SpiderPoint>(`${INTELSPIDER_SERVICE_PATH}/points/${uuid}`, { method: 'PATCH', body: JSON.stringify(data) });

export const deletePoints = (ids: string[]): Promise<void> => Promise.all(ids.map(id => deleteSpiderPoint(id))).then(() => {});

export const deleteSpiderPoint = (uuid: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/points/${uuid}`, { method: 'DELETE' });

export const togglePoint = (uuid: string, isActive: boolean): Promise<void> => 
    (isActive ? enableSpiderPoint(uuid) : disableSpiderPoint(uuid));

export const runPoint = (uuid: string): Promise<void> => triggerSpiderTask({ point_uuid: uuid, task_type: 'initial' });

export const disableSpiderPoint = (uuid: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/points/${uuid}/disable`, { method: 'POST' });

export const enableSpiderPoint = (uuid: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/points/${uuid}/enable`, { method: 'POST' });

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
    return apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/tasks?point_uuid=${pointUuid}${createApiQuery(params).replace('?', '&')}`);
}

// Articles
export const getArticles = (params: any): Promise<PaginatedResponse<ArticlePublic>> => {
    return getSpiderArticles(params).then(res => ({
        ...res,
        items: res.items.map(a => ({
            id: a.uuid, // Map uuid to id for frontend compatibility
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
    // Map 'limit' to 'page_size' if present
    const apiParams = { ...params };
    if (apiParams.limit) {
        apiParams.page_size = apiParams.limit;
        delete apiParams.limit;
    }
    const query = createApiQuery(apiParams);
    return apiFetch<PaginatedResponse<SpiderArticle>>(`${INTELSPIDER_SERVICE_PATH}/articles${query}`);
}

export const getArticleById = (id: string): Promise<InfoItem> => getSpiderArticleDetail(id).then(a => ({
    id: a.uuid,
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
    apiFetch<{ count: number }>(`${INTELSPIDER_SERVICE_PATH}/stats/today_articles_count`);

// Search
export const searchArticlesFiltered = (params: any): Promise<PaginatedResponse<ArticlePublic>> => getArticles(params); 

export const searchSemanticSegments = async (data: any): Promise<{ items: InfoItem[], total: number }> => {
    const res = await apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/search/semantic`, { method: 'POST', body: JSON.stringify(data) });
    const items = (res.items || []).map((item: any) => ({
        ...item,
        // Ensure ID is a string, prioritizing article_id from backend
        id: String(item.article_id || item.id || ''), 
    }));
    return {
        items,
        total: res.total_segments || res.total || 0
    };
};

export const getArticlesByTags = (data: any): Promise<PaginatedResponse<ArticlePublic>> => {
    const query = createApiQuery(data); // tags passed as query params in new API
    return apiFetch<PaginatedResponse<ArticlePublic>>(`${INTELSPIDER_SERVICE_PATH}/articles/by_tags${query}`);
};

export const searchChunks = (data: any): Promise<{ results: SearchChunkResult[] }> => 
    apiFetch<{ results: SearchChunkResult[] }>(`${INTELSPIDER_SERVICE_PATH}/search/chunks`, { method: 'POST', body: JSON.stringify(data) });

export const exportChunks = (data: any): Promise<{ export_data: any }> => 
    apiFetch<{ export_data: any }>(`${INTELSPIDER_SERVICE_PATH}/search/chunks/export`, { method: 'POST', body: JSON.stringify(data) });

// HTML & PDF
export const getArticleHtml = (uuid: string): Promise<{ html_content: string }> => 
    apiFetch<{ html_content: string }>(`${INTELSPIDER_SERVICE_PATH}/articles/${uuid}/html`);

export const generateArticleHtml = (uuid: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/articles/${uuid}/generate_html`, { method: 'POST' });

export const downloadArticlePdf = async (uuid: string): Promise<Blob> => {
    const url = `${INTELSPIDER_SERVICE_PATH}/articles/${uuid}/pdf`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { headers, method: 'POST' }); // API Doc says POST for PDF generation/download
    if (!response.ok) throw new Error('Download failed');
    return response.blob();
}

// LLM Sorting (Legacy?) - Keeping structure but ensuring paths match convention if needed
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
    apiFetch(`${INTELSPIDER_SERVICE_PATH}/gemini/cookies/update`, { method: 'POST', body: JSON.stringify(data) });

export const checkIntelGeminiStatus = (): Promise<{ valid: boolean; message: string }> => 
    apiFetch<{ valid: boolean; message: string }>(`${INTELSPIDER_SERVICE_PATH}/gemini/status`);

export const checkGeminiCookieValidity = (): Promise<{ valid: boolean; message: string }> => 
    apiFetch<{ valid: boolean; message: string }>(`${INTELSPIDER_SERVICE_PATH}/gemini/cookies/check`);

export const toggleIntelHtmlGeneration = (enabled: boolean): Promise<{ message: string }> => 
    apiFetch(`${INTELSPIDER_SERVICE_PATH}/html/generation/enable`, { method: 'POST', body: JSON.stringify({ enabled }) });

export const toggleRetrospectiveHtmlGeneration = (enabled: boolean): Promise<{ message: string }> => 
    apiFetch(`${INTELSPIDER_SERVICE_PATH}/html/retrospective/enable`, { method: 'POST', body: JSON.stringify({ enabled }) });

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

export const getSpiderPendingArticles = (params?: any): Promise<any> => {
    const query = createApiQuery(params);
    return apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/articles/pending${query}`);
}

export const confirmPendingArticles = (ids: string[]): Promise<void> => approveSpiderArticles(ids).then(() => {});
export const rejectPendingArticles = (ids: string[]): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/articles/pending/reject`, { method: 'POST', body: JSON.stringify({ ids }) });

export const approveSpiderArticles = (ids: string[]): Promise<{ ok: boolean; processed: number }> => 
    apiFetch<{ ok: boolean; processed: number }>(`${INTELSPIDER_SERVICE_PATH}/articles/pending/approve`, { method: 'POST', body: JSON.stringify({ ids }) });

// Intel LLM Analysis Tasks
export const createIntelLlmTask = (data: any): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/llm/tasks`, { method: 'POST', body: JSON.stringify(data) });

export const getIntelLlmTasks = (params: any): Promise<{ items: IntelLlmTask[] }> => {
    const query = createApiQuery(params);
    return apiFetch<{ items: IntelLlmTask[] }>(`${INTELSPIDER_SERVICE_PATH}/llm/tasks${query}`); // Check path
}

export const downloadIntelLlmTaskReport = async (uuid: string): Promise<Blob> => {
    const url = `${INTELSPIDER_SERVICE_PATH}/llm/tasks/${uuid}/download`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Download failed');
    return response.blob();
}

// Stats
// New endpoint: /intelspider/analysis/stats
export const getIntelligenceStats = (): Promise<any> => 
    apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/analysis/stats`);

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

// New endpoint: /intelspider/analysis/tasks (Get analysis results)
export const getAnalysisResults = (params: any): Promise<{total: number, page: number, page_size: number, items: AnalysisResult[]}> => {
    const query = createApiQuery(params);
    return apiFetch<{total: number, page: number, page_size: number, items: AnalysisResult[]}>(`${INTELSPIDER_SERVICE_PATH}/analysis/tasks${query}`);
}

export const triggerAnalysis = (articleUuid: string, templateUuid?: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/analysis/trigger/${articleUuid}`, { method: 'POST', body: JSON.stringify({ template_uuid: templateUuid }) });

// Document Management

// Get Uploaded Docs List
export const getUploadedDocs = async (params: any): Promise<{total: number, page: number, page_size: number, items: UploadedDocument[]}> => {
    const query = createApiQuery(params);
    const res = await apiFetch<{total: number, page: number, page_size: number, items: UploadedDocument[]}>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs${query}`);
    // Fix file size unit (KB -> Bytes) for frontend display consistency
    if (res.items) {
        res.items = res.items.map(item => ({
            ...item,
            file_size: (item.file_size || 0) * 1024
        }));
    }
    return res;
}

// Get Doc Detail
export const getUploadedDocDetail = async (uuid: string): Promise<UploadedDocument> => {
    const doc = await apiFetch<UploadedDocument>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/${uuid}`);
    return {
        ...doc,
        file_size: (doc.file_size || 0) * 1024
    };
}

// Upload Docs
export const uploadDocs = (data: { files: File[], point_uuid: string, publish_date?: string }): Promise<UploadedDocument[]> => {
    const formData = new FormData();
    data.files.forEach(f => formData.append('files', f));
    formData.append('point_uuid', data.point_uuid);
    if (data.publish_date) formData.append('publish_date', data.publish_date);
    return apiFetch<UploadedDocument[]>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/upload`, { method: 'POST', body: formData });
}

// Delete Doc
export const deleteUploadedDoc = (uuid: string): Promise<{ message: string }> => 
    apiFetch<{ message: string }>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/${uuid}`, { method: 'DELETE' });

// Download Doc
export const downloadUploadedDoc = async (uuid: string): Promise<Blob> => {
    const url = `${INTELSPIDER_SERVICE_PATH}/uploaded-docs/${uuid}/download`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Download failed');
    return response.blob();
}

// Get Doc Preview
export const getDocPreview = async (uuid: string, page: number): Promise<Blob> => {
    const url = `${INTELSPIDER_SERVICE_PATH}/uploaded-docs/${uuid}/preview/${page}`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Preview failed');
    return response.blob();
}

// --- Doc Tags Management ---

// Get All Tags (Points)
export const getDocTags = (): Promise<DocTag[]> => 
    apiFetch<DocTag[]>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/tags`);

// Create Tag
export const createDocTag = (name: string): Promise<DocTag> => 
    apiFetch<DocTag>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/tags`, { method: 'POST', body: JSON.stringify({ name }) });

// Update Tag
export const updateDocTag = (uuid: string, name: string): Promise<DocTag> => 
    apiFetch<DocTag>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/tags/${uuid}`, { method: 'PUT', body: JSON.stringify({ name }) });

// Delete Tag
export const deleteDocTag = (uuid: string): Promise<{ message: string }> => 
    apiFetch<{ message: string }>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/tags/${uuid}`, { method: 'DELETE' });

// Search Tags
export const searchDocTags = (query: string): Promise<DocTag[]> =>
    apiFetch<DocTag[]>(`${INTELSPIDER_SERVICE_PATH}/search/tags`, { method: 'POST', body: JSON.stringify({ query }) });

// Batch Move Docs
export const batchUpdateDocsPoint = (data: { old_point_uuid: string, new_point_uuid: string, doc_uuids?: string[] }): Promise<{ message: string }> => 
    apiFetch<{ message: string }>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/batch-update-point`, { method: 'POST', body: JSON.stringify(data) });

// Service Health & Proxies
export const getServiceHealth = (): Promise<{ status: string }> => 
    apiFetch<{ status: string }>(`${INTELSPIDER_SERVICE_PATH}/health`);

export const getProxies = (): Promise<SpiderProxy[]> => 
    apiFetch<SpiderProxy[]>(`${INTELSPIDER_SERVICE_PATH}/proxies`);

export const addProxy = (data: { url: string, enabled: boolean }): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/proxies`, { method: 'POST', body: JSON.stringify(data) });

export const deleteProxy = (url: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/proxies/${encodeURIComponent(url)}`, { method: 'DELETE' }); // Encode URL for path param

export const testProxy = (url: string): Promise<{ success: boolean; latency_ms: number }> => 
    apiFetch<{ success: boolean; latency_ms: number }>(`${INTELSPIDER_SERVICE_PATH}/proxies/test`, { method: 'POST', body: JSON.stringify({ url }) });

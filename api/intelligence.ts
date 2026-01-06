
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
export const getSources = (): Promise<IntelligenceSourcePublic[]> => getSpiderSources().then(res => res.items.map(s => ({
    id: s.id,
    uuid: s.id, // Compat
    name: s.name,
    source_name: s.name,
    main_url: s.main_url,
    total_points: s.total_points || 0,
    total_articles: s.total_articles || 0,
    points_count: s.total_points || 0,
    articles_count: s.total_articles || 0,
    created_at: s.created_at || '',
    updated_at: ''
})));

export const getSpiderSources = (params?: { page?: number; size?: number }): Promise<PaginatedResponse<SpiderSource>> => {
    // Default fetch all if no params for admin
    const apiParams = { page: 1, size: 50, ...params };
    const query = createApiQuery(apiParams);
    return apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/sources/${query}`).then(res => ({
        items: res.items,
        total: res.total,
        page: res.page,
        limit: res.size,
        totalPages: res.total_pages
    }));
};

export const createSpiderSource = (data: { name: string; main_url: string }): Promise<SpiderSource> => 
    apiFetch<SpiderSource>(`${INTELSPIDER_SERVICE_PATH}/sources/`, { method: 'POST', body: JSON.stringify(data) });

export const deleteSource = (id: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/sources/${id}`, { method: 'DELETE' });

export const batchDeleteSources = (ids: string[]): Promise<void> =>
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/sources/batch-delete`, { method: 'POST', body: JSON.stringify({ ids }) });

// Points
export const getPoints = (params?: { source_name?: string }): Promise<IntelligencePointPublic[]> => {
    const sourceId = params?.source_name;
    return getSpiderPoints(sourceId).then(res => res.map(p => ({
        id: p.id,
        uuid: p.id, // Compat
        source_id: p.source_id,
        source_uuid: p.source_id, // Compat
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
        initial_pages: p.initial_pages,
        total_articles: p.total_articles || 0
    })));
};

export const getSpiderPoints = (sourceId?: string): Promise<SpiderPoint[]> => {
    const query = sourceId ? `?source_id=${sourceId}` : '';
    // API returns paginated response, map to array for internal usage in some components, 
    // or we should update components to handle pagination. 
    // For now, assuming standard component usage expects array, we extract items.
    // NOTE: This might need full pagination support in future.
    return apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/points/${query}`).then(res => res.items);
}

export const createPoint = (data: any): Promise<void> => createSpiderPoint({
    source_id: data.source_name, // data.source_name carries ID
    name: data.name,
    url: data.url,
    cron_schedule: data.cron_schedule,
    initial_pages: data.initial_pages,
    is_active: true
}).then(() => {});

export const createSpiderPoint = (data: any): Promise<SpiderPoint> => 
    apiFetch<SpiderPoint>(`${INTELSPIDER_SERVICE_PATH}/points/`, { method: 'POST', body: JSON.stringify(data) });

export const updateSpiderPoint = (id: string, data: any): Promise<SpiderPoint> => 
    apiFetch<SpiderPoint>(`${INTELSPIDER_SERVICE_PATH}/points/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const deletePoints = (ids: string[]): Promise<void> => Promise.all(ids.map(id => deleteSpiderPoint(id))).then(() => {});

export const deleteSpiderPoint = (id: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/points/${id}`, { method: 'DELETE' });

export const batchDeletePoints = (ids: string[]): Promise<void> =>
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/points/batch-delete`, { method: 'POST', body: JSON.stringify({ ids }) });

export const togglePoint = (id: string, isActive: boolean): Promise<void> => 
    (isActive ? enableSpiderPoint(id) : disableSpiderPoint(id));

export const runPoint = (id: string): Promise<void> => triggerSpiderTask({ point_id: id, task_type: 'initial' });

export const disableSpiderPoint = (id: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/points/${id}/disable`, { method: 'POST' });

export const enableSpiderPoint = (id: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/points/${id}/enable`, { method: 'POST' });

// Tasks
export const triggerSpiderTask = (data: { point_id: string; task_type: 'initial' | 'incremental' }): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/tasks/trigger/`, { method: 'POST', body: JSON.stringify(data) });

export const getTasks = (params: any): Promise<PaginatedResponse<IntelligenceTaskPublic>> => getSpiderTasks(params);

export const getSpiderTasks = (params?: any): Promise<PaginatedResponse<IntelligenceTaskPublic>> => {
    // Map 'limit' to 'size'
    const apiParams = { ...params };
    if (apiParams.limit) {
        apiParams.size = apiParams.limit;
        delete apiParams.limit;
    }
    const query = createApiQuery(apiParams);
    return apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/tasks${query}`).then(res => ({
        items: res.items,
        total: res.total,
        page: res.page,
        limit: res.size,
        totalPages: res.total_pages
    }));
}

export const getSpiderPointTasks = (pointId: string, params?: any): Promise<any> => {
    return getSpiderTasks({ ...params, point_id: pointId });
}

// Articles
export const getArticles = (params: any): Promise<PaginatedResponse<ArticlePublic>> => {
    return getSpiderArticles(params).then(res => ({
        ...res,
        items: res.items.map(a => ({
            id: a.id,
            title: a.title,
            content: a.content || '',
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
    // Map 'limit' to 'size'
    const apiParams = { ...params };
    if (apiParams.limit) {
        apiParams.size = apiParams.limit;
        delete apiParams.limit;
    }
    // Rename param filters
    if (apiParams.source_uuid) { apiParams.source_id = apiParams.source_uuid; delete apiParams.source_uuid; }
    if (apiParams.point_uuid) { apiParams.point_id = apiParams.point_uuid; delete apiParams.point_uuid; }

    const query = createApiQuery(apiParams);
    return apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/articles/${query}`).then(res => ({
        items: res.items,
        total: res.total,
        page: res.page,
        limit: res.size,
        totalPages: res.total_pages
    }));
}

export const getArticleById = (id: string): Promise<InfoItem> => getSpiderArticleDetail(id).then(a => ({
    id: a.id,
    title: a.title,
    content: a.content || '',
    source_name: a.source_name,
    point_name: a.point_name,
    original_url: a.url,
    publish_date: a.publish_date,
    created_at: a.created_at,
    is_atomized: a.is_atomized,
    tags: a.tags
}));

export const getSpiderArticleDetail = (id: string): Promise<SpiderArticle> => 
    apiFetch<SpiderArticle>(`${INTELSPIDER_SERVICE_PATH}/articles/${id}`);

export const deleteArticles = (ids: string[]): Promise<void> => batchDeleteArticles(ids);

export const deleteSpiderArticle = (id: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/articles/${id}`, { method: 'DELETE' });

export const batchDeleteArticles = (ids: string[]): Promise<void> =>
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/articles/batch-delete`, { method: 'POST', body: JSON.stringify({ ids }) });

export const getTodayArticleCount = (): Promise<{ count: number }> => 
    apiFetch<{ count: number }>(`${INTELSPIDER_SERVICE_PATH}/stats/today_articles_count`);

export const exportBatchSearchArticles = async (data: { queries: any[] }): Promise<Blob> => {
    const url = `${INTELSPIDER_SERVICE_PATH}/articles/export/batch_search`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    headers.set('Content-Type', 'application/json');

    // Map uuid to id in queries if present
    const queries = data.queries.map(q => ({
        ...q,
        source_id: q.source_uuid || q.source_id,
        point_id: q.point_uuid || q.point_id,
    }));

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ queries })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || '导出失败');
    }
    return response.blob();
};

export const exportArticles = async (params: any): Promise<Blob> => {
    // Map params
    const apiParams = { ...params };
    if (apiParams.source_uuid) { apiParams.source_id = apiParams.source_uuid; delete apiParams.source_uuid; }
    if (apiParams.point_uuid) { apiParams.point_id = apiParams.point_uuid; delete apiParams.point_uuid; }

    const query = createApiQuery(apiParams);
    const url = `${INTELSPIDER_SERVICE_PATH}/articles/export${query}`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const response = await fetch(url, { headers });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || '导出失败');
    }
    return response.blob();
};

// Search
export const searchArticlesFiltered = (params: any): Promise<PaginatedResponse<ArticlePublic>> => getArticles(params); 

export const searchSemanticSegments = async (data: any): Promise<{ items: InfoItem[], total: number }> => {
    // Map uuid to id
    const payload = {
        ...data,
        source_id: data.source_uuid || data.source_id,
        point_id: data.point_uuid || data.point_id
    };
    delete payload.source_uuid;
    delete payload.point_uuid;

    const res = await apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/search/semantic`, { method: 'POST', body: JSON.stringify(payload) });
    const items = (res.items || []).map((item: any) => ({
        ...item,
        id: String(item.article_id || item.id || ''), 
    }));
    return {
        items,
        total: res.total_segments || res.total || 0
    };
};

export const getArticlesByTags = (data: any): Promise<PaginatedResponse<ArticlePublic>> => {
    const query = createApiQuery(data); 
    // New endpoint: GET /api/intelspider/articles/by_tags
    return apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/articles/by_tags${query}`).then(res => ({
        items: res.items,
        total: res.total,
        page: res.page,
        limit: res.size,
        totalPages: res.total_pages
    }));
};

export const searchChunks = (data: any): Promise<{ results: SearchChunkResult[] }> => {
    console.warn("searchChunks API might be deprecated in favor of semantic search");
    return apiFetch<{ results: SearchChunkResult[] }>(`${INTELSPIDER_SERVICE_PATH}/search/chunks`, { method: 'POST', body: JSON.stringify(data) });
}

export const exportChunks = (data: any): Promise<{ export_data: any }> => 
    apiFetch<{ export_data: any }>(`${INTELSPIDER_SERVICE_PATH}/search/chunks/export`, { method: 'POST', body: JSON.stringify(data) });

// --- Jina Reader API ---
export const fetchJinaReader = async (url: string, customHeaders?: Record<string, string>): Promise<string> => {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const headers = new Headers();
    headers.set('X-Return-Format', 'markdown');
    
    if (!customHeaders || (!customHeaders['X-Exclude-Selector'] && !customHeaders['X-Target-Selector'])) {
        headers.set('X-Exclude-Selector', 'header, footer, nav, .footer, .header, .nav, #footer, #header');
    }

    if (customHeaders) {
        Object.entries(customHeaders).forEach(([key, value]) => {
            headers.set(key, value);
        });
    }
    
    const response = await fetch(jinaUrl, {
        method: 'GET',
        headers: headers
    });

    if (!response.ok) {
        throw new Error(`Jina Fetch Error: ${response.statusText}`);
    }

    return response.text();
};


// HTML & PDF
export const getArticleHtml = (id: string): Promise<{ html_content: string }> => 
    apiFetch<{ html_content: string }>(`${INTELSPIDER_SERVICE_PATH}/articles/${id}/html`);

export const generateArticleHtml = (id: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/articles/${id}/generate_html`, { method: 'POST' });

export const downloadArticlePdf = async (id: string): Promise<Blob> => {
    const url = `${INTELSPIDER_SERVICE_PATH}/articles/${id}/pdf`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { headers, method: 'POST' }); 
    if (!response.ok) throw new Error('Download failed');
    return response.blob();
}

// LLM Tasks
export const createLlmSearchTask = (data: { query_text: string }): Promise<void> => {
    console.warn("createLlmSearchTask might be deprecated.");
    return Promise.resolve();
}

export const getLlmSearchTasks = (params: any): Promise<{ items: LlmSearchTaskItem[] }> => {
    console.warn("getLlmSearchTasks might be deprecated.");
    return Promise.resolve({ items: [] });
}

// Gemini
export const updateGeminiCookies = (data: any): Promise<any> => updateIntelGeminiCookies(data);
export const checkGeminiCookies = (): Promise<any> => checkIntelGeminiStatus();
export const toggleHtmlGeneration = (enabled: boolean): Promise<any> => toggleIntelHtmlGeneration(enabled);

export const updateIntelGeminiCookies = (data: any): Promise<any> => 
    apiFetch(`${INTELSPIDER_SERVICE_PATH}/gemini/cookies/update`, { method: 'POST', body: JSON.stringify(data) });

export const checkIntelGeminiStatus = (): Promise<{ valid: boolean; message: string }> => 
    apiFetch<{ valid: boolean; message: string }>(`${INTELSPIDER_SERVICE_PATH}/gemini/cookies/check`);

export const checkGeminiCookieValidity = (): Promise<{ valid: boolean; message: string }> => 
     checkIntelGeminiStatus();

export const toggleIntelHtmlGeneration = (enabled: boolean): Promise<{ message: string }> => 
    apiFetch(`${INTELSPIDER_SERVICE_PATH}/html/generation/enable`, { method: 'POST', body: JSON.stringify({ enabled }) });

export const toggleRetrospectiveHtmlGeneration = (enabled: boolean): Promise<{ message: string }> => 
    apiFetch(`${INTELSPIDER_SERVICE_PATH}/html/retrospective/enable`, { method: 'POST', body: JSON.stringify({ enabled }) });

export const createGenericPoint = (data: any): Promise<void> => createSpiderPoint({ ...data, mode: 'generic' }).then(() => {});
export const updateGenericPoint = (id: string, data: any): Promise<void> => updateSpiderPoint(id, data).then(() => {});
export const getSourcesAndPoints = (): Promise<any[]> => getSources().then(async sources => {
    const allPoints = await getSpiderPoints(); // Helper should fetch all
    const sourcesWithPoints = sources.map(s => {
        const sourcePoints = allPoints.filter(p => p.source_id === s.id);
        return { ...s, points: sourcePoints };
    });
    return sourcesWithPoints;
});
export const getGenericTasks = (params: any): Promise<any> => getSpiderTasks(params);

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

export const createIntelLlmTask = (data: any): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/llm/tasks`, { method: 'POST', body: JSON.stringify(data) });

export const getIntelLlmTasks = (params: any): Promise<{ items: IntelLlmTask[] }> => {
    const apiParams = { ...params };
    if (apiParams.limit) {
        apiParams.size = apiParams.limit;
        delete apiParams.limit;
    }
    const query = createApiQuery(apiParams);
    return apiFetch<{ items: IntelLlmTask[] }>(`${INTELSPIDER_SERVICE_PATH}/llm/tasks${query}`); 
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

export const getIntelligenceStats = (): Promise<any> => 
    apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/analysis/stats`);

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

export const getAnalysisResults = (params: any): Promise<{total: number, page: number, page_size: number, items: AnalysisResult[]}> => {
    const apiParams = { ...params };
    if (apiParams.limit) {
        apiParams.page_size = apiParams.limit;
        delete apiParams.limit;
    }
    const query = createApiQuery(apiParams);
    return apiFetch<{total: number, page: number, page_size: number, items: AnalysisResult[]}>(`${INTELSPIDER_SERVICE_PATH}/analysis/results${query}`);
}

export const triggerAnalysis = (articleId: string, templateUuid?: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/analysis/trigger/${articleId}`, { method: 'POST', body: JSON.stringify({ template_uuid: templateUuid }) });

export const getUploadedDocs = async (params: any): Promise<{total: number, page: number, page_size: number, items: UploadedDocument[]}> => {
    const apiParams = { ...params };
    if (apiParams.limit) {
        apiParams.size = apiParams.limit;
        delete apiParams.limit;
    }
    const query = createApiQuery(apiParams);
    const res = await apiFetch<{total: number, page: number, page_size: number, items: UploadedDocument[]}>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs${query}`);
    if (res.items) {
        res.items = res.items.map(item => ({
            ...item,
            file_size: (item.file_size || 0) * 1024
        }));
    }
    return res;
}

export const getUploadedDocDetail = async (uuid: string): Promise<UploadedDocument> => {
    const doc = await apiFetch<UploadedDocument>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/${uuid}`);
    return {
        ...doc,
        file_size: (doc.file_size || 0) * 1024
    };
}

export const uploadDocs = (data: { files: File[], point_uuid: string, publish_date?: string }): Promise<UploadedDocument[]> => {
    const formData = new FormData();
    data.files.forEach(f => formData.append('files', f));
    formData.append('point_uuid', data.point_uuid);
    if (data.publish_date) formData.append('publish_date', data.publish_date);
    return apiFetch<UploadedDocument[]>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/upload`, { method: 'POST', body: formData });
}

export const deleteUploadedDoc = (uuid: string): Promise<{ message: string }> => 
    apiFetch<{ message: string }>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/${uuid}`, { method: 'DELETE' });

export const regenerateDocumentSummary = (uuid: string): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/${uuid}/regenerate-summary`, { method: 'POST' });

export const regenerateDocumentCover = (uuid: string): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/${uuid}/regenerate-cover`, { method: 'POST' });

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
    apiFetch<DocTag[]>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/tags`);

export const createDocTag = (name: string): Promise<DocTag> => 
    apiFetch<DocTag>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/tags`, { method: 'POST', body: JSON.stringify({ name }) });

export const updateDocTag = (uuid: string, name: string): Promise<DocTag> => 
    apiFetch<DocTag>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/tags/${uuid}`, { method: 'PUT', body: JSON.stringify({ name }) });

export const deleteDocTag = (uuid: string): Promise<{ message: string }> => 
    apiFetch<{ message: string }>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/tags/${uuid}`, { method: 'DELETE' });

export const searchDocTags = (query: string): Promise<DocTag[]> =>
    apiFetch<DocTag[]>(`${INTELSPIDER_SERVICE_PATH}/search/tags`, { method: 'POST', body: JSON.stringify({ query }) });

export const batchUpdateDocsPoint = (data: { old_point_uuid: string, new_point_uuid: string, doc_uuids?: string[] }): Promise<{ message: string }> => 
    apiFetch<{ message: string }>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/batch-update-point`, { method: 'POST', body: JSON.stringify(data) });

export const getServiceHealth = (): Promise<{ status: string }> => {
    return apiFetch<{ status: string }>(`${INTELSPIDER_SERVICE_PATH}/health`);
}

export const getProxies = (): Promise<SpiderProxy[]> => 
    apiFetch<SpiderProxy[]>(`${INTELSPIDER_SERVICE_PATH}/proxies/`);

export const addProxy = (data: { url: string, enabled: boolean }): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/proxies/`, { method: 'POST', body: JSON.stringify(data) });

export const deleteProxy = (url: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/proxies/${encodeURIComponent(url)}`, { method: 'DELETE' }); 

export const testProxy = (url: string): Promise<{ success: boolean; latency_ms: number }> => 
    apiFetch<{ success: boolean; latency_ms: number }>(`${INTELSPIDER_SERVICE_PATH}/proxies/test`, { method: 'POST', body: JSON.stringify({ url }) });

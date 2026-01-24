
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
            refined_title: a.refined_title,
            content: a.content || '',
            refined_content: a.refined_content,
            has_refined_content: a.has_refined_content,
            source_name: a.source_name,
            point_name: a.point_name,
            original_url: a.url,
            publish_date: a.publish_date,
            created_at: a.created_at,
            is_atomized: !!a.is_atomized,
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
    
    // Map 'is_atomized' to 'has_refined_content' if needed by backend, though API doc says 'has_refined_content' is used for filtering.
    // The previous implementation used 'is_atomized'. We should check if the backend supports 'has_refined_content' as a filter.
    // The prompt says "has_refined_content: optional... (compatible with is_atomized)". So sending has_refined_content is safer.
    if (apiParams.is_atomized !== undefined) {
        apiParams.has_refined_content = apiParams.is_atomized;
        delete apiParams.is_atomized;
    }

    const query = createApiQuery(apiParams);
    return apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/articles/${query}`).then(res => ({
        items: res.items.map((a: any) => ({ 
            ...a, 
            is_atomized: !!a.is_atomized, // Keep for backward compat
            refined_title: a.refined_title,
            refined_content: a.refined_content,
            has_refined_content: a.has_refined_content
        })),
        total: res.total,
        page: res.page,
        limit: res.size,
        totalPages: res.total_pages
    }));
}

export const getArticleById = (id: string): Promise<InfoItem> => getSpiderArticleDetail(id).then(a => ({
    id: a.id,
    title: a.title,
    refined_title: a.refined_title,
    content: a.content || '',
    refined_content: a.refined_content,
    has_refined_content: a.has_refined_content,
    source_name: a.source_name,
    point_name: a.point_name,
    original_url: a.url,
    publish_date: a.publish_date,
    created_at: a.created_at,
    is_atomized: !!a.is_atomized,
    tags: a.tags
}));

export const getSpiderArticleDetail = (id: string): Promise<SpiderArticle> => 
    apiFetch<SpiderArticle>(`${INTELSPIDER_SERVICE_PATH}/articles/${id}`).then(a => ({
        ...a,
        is_atomized: !!a.is_atomized
    }));

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

    const response = await fetch(url, { method: 'GET', headers });
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
        is_atomized: !!item.is_atomized,
        refined_title: item.refined_title,
        refined_content: item.refined_content,
        has_refined_content: item.has_refined_content
    }));
    return {
        items,
        total: res.total_segments || res.total || 0
    };
};

/**
 * 批量分组语义检索 (最新)
 * 支持同时检索多个文本，返回按检索项分组的结果
 */
export const searchSemanticBatchGrouped = async (data: {
    query_texts: string[];
    source_id?: string;
    point_id?: string;
    start_date?: string;
    end_date?: string;
    similarity_threshold?: number;
    max_segments_per_query?: number;
}): Promise<{ results: any[] }> => {
    return apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/search/semantic/grouped/batch`, { 
        method: 'POST', 
        body: JSON.stringify(data) 
    });
};

export const getArticlesByTags = (data: any): Promise<PaginatedResponse<ArticlePublic>> => {
    const query = createApiQuery(data); 
    return apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/articles/by_tags${query}`).then(res => ({
        items: res.items.map((a: any) => ({ 
            ...a, 
            is_atomized: !!a.is_atomized,
            refined_title: a.refined_title,
            has_refined_content: a.has_refined_content
        })),
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
export const getArticleHtml = async (id: string): Promise<{ html_content: string }> => {
    const url = `${INTELSPIDER_SERVICE_PATH}/articles/${id}/html`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    
    const response = await fetch(url, { headers });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to fetch HTML');
    }
    
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        return { html_content: data.html_content || data.html || '' };
    } else {
        const html = await response.text();
        return { html_content: html };
    }
};

export const generateArticleHtml = (id: string, provider: string = 'zhipuai'): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/articles/${id}/generate_html?provider=${provider}`, { method: 'POST' });

export const startBackgroundBatchHtmlGeneration = (data: { provider: string }): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`${INTELSPIDER_SERVICE_PATH}/html/batch/generate`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

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

export const downloadIntelLlmTaskReport = async (id: string): Promise<Blob> => {
    const url = `${INTELSPIDER_SERVICE_PATH}/llm/tasks/${id}/download`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    
    const response = await fetch(url, { method: 'GET', headers });
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


// --- Uploaded Docs (Revised) ---

export const getUploadedDocs = async (params: { page?: number; size?: number; status?: string; keyword?: string; source_id?: string; point_id?: string }): Promise<{items: UploadedDocument[], total: number, page: number, size: number, total_pages: number}> => {
    const query = createApiQuery(params);
    const res = await apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs${query}`);
    const items = (res.items || []).map((item: any) => ({
        ...item,
        uuid: item.id, // Map 'id' from API to 'uuid' for compatibility
        file_size: item.file_size || 0,
        page_count: item.page_count || 0
    }));
    return { ...res, items };
}

export const getUploadedDocDetail = async (id: string): Promise<UploadedDocument> => {
    const res = await apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/${id}`);
    return { ...res, uuid: res.id, file_size: res.file_size || 0, page_count: res.page_count || 0 };
}

export const uploadDocs = (data: { 
    files?: File[], 
    pdf_urls?: string[], 
    custom_filenames?: string[],
    point_id?: string, 
    publish_date?: string 
}): Promise<any> => {
    const formData = new FormData();
    if (data.files) data.files.forEach(f => formData.append('files', f));
    if (data.pdf_urls) data.pdf_urls.forEach(url => formData.append('pdf_urls', url));
    if (data.custom_filenames) data.custom_filenames.forEach(name => formData.append('custom_filenames', name));
    
    if (data.point_id) {
        formData.append('point_uuid', data.point_id);
    }
    if (data.publish_date) formData.append('publish_date', data.publish_date);
    return apiFetch(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/upload`, { method: 'POST', body: formData });
}

export const deleteUploadedDoc = (id: string): Promise<{ message: string }> => 
    apiFetch<{ message: string }>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/${id}`, { method: 'DELETE' });

export const regenerateDocumentSummary = (id: string): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/${id}/regenerate-summary`, { method: 'POST' });

export const regenerateDocumentCover = (id: string): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/${id}/regenerate-cover`, { method: 'POST' });

export const getUploadedDocCover = async (id: string): Promise<Blob> => {
    const url = `${INTELSPIDER_SERVICE_PATH}/uploaded-docs/${id}/cover`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    
    // Explicitly accept images
    headers.set('Accept', 'image/*');

    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Fetch cover failed');
    return response.blob();
}

export const downloadUploadedDoc = async (id: string): Promise<Blob> => {
    const url = `${INTELSPIDER_SERVICE_PATH}/uploaded-docs/${id}/download`; 
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    
    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) throw new Error('Download failed');
    return response.blob();
}

export const getDocPreview = async (id: string, page: number): Promise<Blob> => {
    const url = `${INTELSPIDER_SERVICE_PATH}/uploaded-docs/${id}/preview/${page}`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Preview failed');
    return response.blob();
}

// Doc Tags (Points mapping)
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

// --- New Gemini Chat API ---

export const chatGemini = async (
    messages: { role: string; content: string }[],
    model: string = 'gemini-2.5-flash'
): Promise<any> => {
    return apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/gemini/chat/completions`, {
        method: 'POST',
        body: JSON.stringify({
            model,
            messages,
            stream: false // Currently only supporting non-streaming as per requirement docs for analysis
        })
    });
};

// --- New Doc Listing API for Optimization ---
export const getUploadedDocsStats = async (pointNames?: string[]): Promise<{ point_name: string; count: number }[]> => {
    let url = `${INTELSPIDER_SERVICE_PATH}/uploaded-docs/stats/by-point`;
    if (pointNames && pointNames.length > 0) {
        const params = new URLSearchParams();
        pointNames.forEach(n => params.append('point_names', n));
        url += `?${params.toString()}`;
    }
    return apiFetch(url);
};

export const getUploadedDocsLight = async (params: { page?: number; size?: number; point_name?: string; publish_date?: string }): Promise<any> => {
    const query = createApiQuery(params);
    return apiFetch(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/list-light${query}`);
};
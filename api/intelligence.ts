
import { INTELSPIDER_SERVICE_PATH } from '../config';
import { 
    PaginatedResponse, 
    IntelligenceSourcePublic, 
    IntelligencePointPublic, 
    InfoItem, 
    ArticlePublic, 
    SearchChunkResult, 
    LlmSearchTaskItem, 
    IntelligenceTaskPublic,
    SpiderSource,
    SpiderPoint,
    SpiderTask,
    SpiderTaskCounts,
    SpiderTaskTypeCounts,
    PendingArticle,
    IntelLlmTask,
    AnalysisTemplate,
    AnalysisResult,
    UploadedDocument,
    DocTag,
    SpiderProxy,
    CreateIntelLlmTaskRequest,
    GenericTask
} from '../types';
import { apiFetch, createApiQuery } from './helper';

// --- Sources (General/Public) ---
export const getSources = (): Promise<IntelligenceSourcePublic[]> => 
    apiFetch<IntelligenceSourcePublic[]>(`${INTELSPIDER_SERVICE_PATH}/public/sources`);

export const getPoints = (params: { source_name?: string }): Promise<IntelligencePointPublic[]> => {
    const query = createApiQuery(params);
    return apiFetch<IntelligencePointPublic[]>(`${INTELSPIDER_SERVICE_PATH}/public/points${query}`);
};

export const createPoint = (data: any): Promise<IntelligencePointPublic> => 
    apiFetch<IntelligencePointPublic>(`${INTELSPIDER_SERVICE_PATH}/points`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

export const deletePoints = (ids: string[]): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/points/batch-delete`, {
        method: 'POST',
        body: JSON.stringify({ ids })
    });

export const deleteSource = (id: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/sources/${id}`, { method: 'DELETE' });

export const togglePoint = (id: string, isActive: boolean): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/points/${id}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ is_active: isActive })
    });

export const runPoint = (id: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/points/${id}/run`, { method: 'POST' });

// --- Stats ---
export const getIntelligenceStats = (): Promise<any> => 
    apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/stats/overview`);

export const getTodayArticleCount = (): Promise<{ count: number }> => 
    apiFetch<{ count: number }>(`${INTELSPIDER_SERVICE_PATH}/stats/today`);

// --- Articles ---
export const getArticles = (params: any): Promise<PaginatedResponse<ArticlePublic>> => {
    const query = createApiQuery(params);
    return apiFetch<PaginatedResponse<ArticlePublic>>(`${INTELSPIDER_SERVICE_PATH}/articles${query}`);
};

export const getArticleById = (id: string): Promise<InfoItem> => 
    apiFetch<InfoItem>(`${INTELSPIDER_SERVICE_PATH}/articles/${id}`);

export const deleteArticles = (ids: string[]): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/articles/batch`, {
        method: 'DELETE',
        body: JSON.stringify({ ids })
    });

export const searchArticlesFiltered = (params: any): Promise<PaginatedResponse<InfoItem>> => {
    // Note: Assuming search endpoint might be POST or GET with query params
    // If it's a complex search, POST is safer. If params are query-string compatible, use GET.
    // Based on typical usage, let's use POST for filtering.
    return apiFetch<PaginatedResponse<InfoItem>>(`${INTELSPIDER_SERVICE_PATH}/articles/search`, {
        method: 'POST',
        body: JSON.stringify(params)
    });
};

export const getArticlesByTags = (params: any): Promise<PaginatedResponse<InfoItem>> => {
    // Typically POST if tags array is sent
    return apiFetch<PaginatedResponse<InfoItem>>(`${INTELSPIDER_SERVICE_PATH}/articles/tags`, {
        method: 'POST',
        body: JSON.stringify(params)
    });
}

export const searchSemanticSegments = (body: any): Promise<{ items: InfoItem[], total: number }> => 
    apiFetch<{ items: InfoItem[], total: number }>(`${INTELSPIDER_SERVICE_PATH}/search/semantic`, {
        method: 'POST',
        body: JSON.stringify(body)
    });

export const searchChunks = (body: any): Promise<{ results: SearchChunkResult[] }> => 
    apiFetch<{ results: SearchChunkResult[] }>(`${INTELSPIDER_SERVICE_PATH}/search/chunks`, {
        method: 'POST',
        body: JSON.stringify(body)
    });

export const exportChunks = (body: any): Promise<{ export_data: any[] }> => 
    apiFetch<{ export_data: any[] }>(`${INTELSPIDER_SERVICE_PATH}/search/chunks/export`, {
        method: 'POST',
        body: JSON.stringify(body)
    });

// --- LLM Tasks ---
export const createLlmSearchTask = (data: { query_text: string }): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/llm/search-tasks`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

export const getLlmSearchTasks = (params: any): Promise<PaginatedResponse<LlmSearchTaskItem>> => {
    const query = createApiQuery(params);
    return apiFetch<PaginatedResponse<LlmSearchTaskItem>>(`${INTELSPIDER_SERVICE_PATH}/llm/search-tasks${query}`);
};

export const createIntelLlmTask = (data: CreateIntelLlmTaskRequest): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/llm/intel-tasks`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

export const getIntelLlmTasks = (params: any): Promise<PaginatedResponse<IntelLlmTask>> => {
    const query = createApiQuery(params);
    return apiFetch<PaginatedResponse<IntelLlmTask>>(`${INTELSPIDER_SERVICE_PATH}/llm/intel-tasks${query}`);
};

export const downloadIntelLlmTaskReport = async (uuid: string): Promise<Blob> => {
    const url = `${INTELSPIDER_SERVICE_PATH}/llm/intel-tasks/${uuid}/report`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('下载报告失败');
    return response.blob();
};

// --- Gemini Settings ---
export const updateGeminiCookies = (data: any): Promise<any> => 
    apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/gemini/cookies`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

export const checkGeminiCookies = (): Promise<{ has_cookie: boolean; valid: boolean }> => 
    apiFetch<{ has_cookie: boolean; valid: boolean }>(`${INTELSPIDER_SERVICE_PATH}/gemini/cookies/check`);

export const toggleHtmlGeneration = (enable: boolean): Promise<any> => 
    apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/gemini/html-generation`, {
        method: 'POST',
        body: JSON.stringify({ enable })
    });

// Alias for Intel specific naming in components
export const updateIntelGeminiCookies = updateGeminiCookies;
export const checkIntelGeminiStatus = checkGeminiCookies;
export const toggleIntelHtmlGeneration = toggleHtmlGeneration;

export const toggleRetrospectiveHtmlGeneration = (enable: boolean): Promise<any> => 
    apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/gemini/html-generation/retro`, {
        method: 'POST',
        body: JSON.stringify({ enable })
    });

// --- Generic Crawler ---
export const createGenericPoint = (data: any): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/generic/points`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

export const updateGenericPoint = (id: string, data: any): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/generic/points/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });

export const getSourcesAndPoints = (): Promise<any[]> => 
    apiFetch<any[]>(`${INTELSPIDER_SERVICE_PATH}/generic/sources-points`); 

export const getGenericTasks = (params: any): Promise<PaginatedResponse<GenericTask>> => {
    const query = createApiQuery(params);
    return apiFetch<PaginatedResponse<GenericTask>>(`${INTELSPIDER_SERVICE_PATH}/generic/tasks${query}`);
};

// --- Spider Management ---
export const getSpiderSources = (): Promise<SpiderSource[]> => 
    apiFetch<SpiderSource[]>(`${INTELSPIDER_SERVICE_PATH}/spider/sources`);

export const createSpiderSource = (data: any): Promise<SpiderSource> => 
    apiFetch<SpiderSource>(`${INTELSPIDER_SERVICE_PATH}/spider/sources`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

export const getSpiderPoints = (sourceUuid: string): Promise<SpiderPoint[]> => 
    apiFetch<SpiderPoint[]>(`${INTELSPIDER_SERVICE_PATH}/spider/sources/${sourceUuid}/points`);

export const createSpiderPoint = (data: any): Promise<SpiderPoint> => 
    apiFetch<SpiderPoint>(`${INTELSPIDER_SERVICE_PATH}/spider/points`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

export const updateSpiderPoint = (uuid: string, data: any): Promise<SpiderPoint> => 
    apiFetch<SpiderPoint>(`${INTELSPIDER_SERVICE_PATH}/spider/points/${uuid}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });

export const deleteSpiderPoint = (uuid: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/spider/points/${uuid}`, { method: 'DELETE' });

export const disableSpiderPoint = (uuid: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/spider/points/${uuid}/disable`, { method: 'POST' });

export const enableSpiderPoint = (uuid: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/spider/points/${uuid}/enable`, { method: 'POST' });

export const triggerSpiderTask = (data: { point_uuid: string, task_type: string }): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/spider/tasks/trigger`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

export const getSpiderTasks = (params?: any): Promise<{ items: SpiderTask[], total: number } | SpiderTask[]> => {
    const query = createApiQuery(params);
    return apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/spider/tasks${query}`);
};

export const getTasks = getSpiderTasks; // Alias for IntelligenceTasksPanel

export const getSpiderPointTasks = (pointUuid: string, params: any): Promise<{ items: SpiderTask[], total: number, counts: SpiderTaskCounts, type_counts?: SpiderTaskTypeCounts }> => {
    const query = createApiQuery(params);
    return apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/spider/points/${pointUuid}/tasks${query}`);
};

export const getSpiderPendingArticles = (params?: any): Promise<PendingArticle[]> => {
    const query = createApiQuery(params);
    return apiFetch<PendingArticle[]>(`${INTELSPIDER_SERVICE_PATH}/spider/articles/pending${query}`);
};

// Wrapper for PendingArticlesManager
export const getPendingArticles = async (params: any): Promise<{ items: PendingArticle[], total: number }> => {
    const query = createApiQuery(params);
    const res = await apiFetch<any>(`${INTELSPIDER_SERVICE_PATH}/spider/articles/pending${query}`);
    if (Array.isArray(res)) {
        return { items: res, total: res.length };
    }
    return res;
};

export const approveSpiderArticles = (ids: string[]): Promise<{ ok: boolean, processed: number }> => 
    apiFetch<{ ok: boolean, processed: number }>(`${INTELSPIDER_SERVICE_PATH}/spider/articles/approve`, {
        method: 'POST',
        body: JSON.stringify({ ids })
    });

export const confirmPendingArticles = approveSpiderArticles; // Alias

export const rejectPendingArticles = (ids: string[]): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/spider/articles/reject`, {
        method: 'POST',
        body: JSON.stringify({ ids })
    });

export const getSpiderArticles = (params: any): Promise<{ items: SpiderArticle[], total: number }> => {
    const query = createApiQuery(params);
    return apiFetch<{ items: SpiderArticle[], total: number }>(`${INTELSPIDER_SERVICE_PATH}/spider/articles${query}`);
};

export const deleteSpiderArticle = (id: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/spider/articles/${id}`, { method: 'DELETE' });

export const getSpiderArticleDetail = (id: string): Promise<SpiderArticle> => 
    apiFetch<SpiderArticle>(`${INTELSPIDER_SERVICE_PATH}/spider/articles/${id}`);

export const generateArticleHtml = (id: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/spider/articles/${id}/generate-html`, { method: 'POST' });

export const getArticleHtml = (id: string): Promise<{ html_content: string }> => 
    apiFetch<{ html_content: string }>(`${INTELSPIDER_SERVICE_PATH}/spider/articles/${id}/html`);

export const downloadArticlePdf = async (id: string): Promise<Blob> => {
    const url = `${INTELSPIDER_SERVICE_PATH}/spider/articles/${id}/pdf`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('下载 PDF 失败');
    return response.blob();
};

export const triggerAnalysis = (id: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/spider/articles/${id}/analyze`, { method: 'POST' });

// --- Service Status & Proxies ---
export const getServiceHealth = (): Promise<{ status: string }> => 
    apiFetch<{ status: string }>(`${INTELSPIDER_SERVICE_PATH}/health`);

export const getProxies = (): Promise<SpiderProxy[]> => 
    apiFetch<SpiderProxy[]>(`${INTELSPIDER_SERVICE_PATH}/proxies`);

export const addProxy = (data: { url: string; enabled: boolean }): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/proxies`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

export const deleteProxy = (url: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/proxies`, {
        method: 'DELETE',
        body: JSON.stringify({ url })
    });

export const testProxy = (url: string): Promise<{ success: boolean; latency_ms: number }> => 
    apiFetch<{ success: boolean; latency_ms: number }>(`${INTELSPIDER_SERVICE_PATH}/proxies/test`, {
        method: 'POST',
        body: JSON.stringify({ url })
    });

// --- Uploaded Docs ---
export const getUploadedDocs = (params: any): Promise<PaginatedResponse<UploadedDocument>> => {
    const query = createApiQuery(params);
    return apiFetch<PaginatedResponse<UploadedDocument>>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs${query}`);
};

export const uploadDocs = (data: { files: File[], point_uuid: string, publish_date?: string }): Promise<void> => {
    const formData = new FormData();
    data.files.forEach(f => formData.append('files', f));
    formData.append('point_uuid', data.point_uuid);
    if (data.publish_date) formData.append('publish_date', data.publish_date);
    
    return apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs`, {
        method: 'POST',
        body: formData
    });
};

export const downloadUploadedDoc = async (docUuid: string): Promise<Blob> => {
    const url = `${INTELSPIDER_SERVICE_PATH}/uploaded-docs/${docUuid}/download`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('下载文件失败');
    return response.blob();
};

export const deleteUploadedDoc = (docUuid: string): Promise<void> => {
    return apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/${docUuid}`, {
        method: 'DELETE'
    });
};

export const getDocPreview = async (docUuid: string, pageNum: number): Promise<Blob> => {
    const url = `${INTELSPIDER_SERVICE_PATH}/uploaded-docs/${docUuid}/preview/${pageNum}`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('加载预览失败');
    return response.blob();
};

export const getDocTags = (): Promise<DocTag[]> => 
    apiFetch<DocTag[]>(`${INTELSPIDER_SERVICE_PATH}/doc-tags`);

export const createDocTag = (name: string): Promise<DocTag> => 
    apiFetch<DocTag>(`${INTELSPIDER_SERVICE_PATH}/doc-tags`, {
        method: 'POST',
        body: JSON.stringify({ name })
    });

export const updateDocTag = (uuid: string, name: string): Promise<DocTag> => 
    apiFetch<DocTag>(`${INTELSPIDER_SERVICE_PATH}/doc-tags/${uuid}`, {
        method: 'PUT',
        body: JSON.stringify({ name })
    });

export const deleteDocTag = (uuid: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/doc-tags/${uuid}`, { method: 'DELETE' });

export const batchUpdateDocsPoint = (data: { old_point_uuid: string, new_point_uuid: string }): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/batch-move`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

// --- Analysis Templates ---
export const createAnalysisTemplate = (data: any): Promise<AnalysisTemplate> => 
    apiFetch<AnalysisTemplate>(`${INTELSPIDER_SERVICE_PATH}/analysis/templates`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

export const getAnalysisTemplates = (params: any): Promise<AnalysisTemplate[]> => {
    const query = createApiQuery(params);
    return apiFetch<AnalysisTemplate[]>(`${INTELSPIDER_SERVICE_PATH}/analysis/templates${query}`);
};

export const updateAnalysisTemplate = (uuid: string, data: any): Promise<AnalysisTemplate> => 
    apiFetch<AnalysisTemplate>(`${INTELSPIDER_SERVICE_PATH}/analysis/templates/${uuid}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });

export const deleteAnalysisTemplate = (uuid: string): Promise<void> => 
    apiFetch<void>(`${INTELSPIDER_SERVICE_PATH}/analysis/templates/${uuid}`, { method: 'DELETE' });

export const getAnalysisResults = (params: any): Promise<PaginatedResponse<AnalysisResult>> => {
    const query = createApiQuery(params);
    return apiFetch<PaginatedResponse<AnalysisResult>>(`${INTELSPIDER_SERVICE_PATH}/analysis/results${query}`);
};

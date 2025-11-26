
import { COMPETITIVENESS_ANALYSIS_SERVICE_PATH, COMPETITIVENESS_SERVICE_PATH } from '../config';
import { 
    PaginatedResponse, KnowledgeBaseItem,
    KnowledgeBaseDetail, KnowledgeBaseMeta, SourceArticleWithRecords, KnowledgeBaseTraceability,
    DashboardOverview, DashboardTrendItem, DashboardDistributionItem, DashboardQuality,
    DataQueryResponse
} from '../types';
import { apiFetch, createApiQuery } from './helper';

// --- Analysis Tasks ---

export const triggerArticleAnalysis = (articleId: string): Promise<{ task_id: string; status: string; message: string }> => {
    return apiFetch<{ task_id: string; status: string; message: string }>(`${COMPETITIVENESS_ANALYSIS_SERVICE_PATH}/analyze/article`, {
        method: 'POST',
        body: JSON.stringify({ article_id: articleId }),
    });
};

export const triggerBatchAnalysis = (articleIds: string[]): Promise<any> => {
    return apiFetch<any>(`${COMPETITIVENESS_ANALYSIS_SERVICE_PATH}/analyze/batch`, {
        method: 'POST',
        body: JSON.stringify({ article_ids: articleIds }),
    });
};

// --- Knowledge Base (Read & Export) ---

export const getKnowledgeBase = (params: any): Promise<PaginatedResponse<KnowledgeBaseItem>> => {
    const query = createApiQuery(params);
    return apiFetch<PaginatedResponse<KnowledgeBaseItem>>(`${COMPETITIVENESS_ANALYSIS_SERVICE_PATH}/knowledge_base${query}`);
};

export const getKnowledgeBaseDetail = (id: number): Promise<KnowledgeBaseDetail> => {
    return apiFetch<KnowledgeBaseDetail>(`${COMPETITIVENESS_ANALYSIS_SERVICE_PATH}/knowledge_base/${id}`);
};

export const getKnowledgeBaseMeta = (): Promise<KnowledgeBaseMeta> => {
    return apiFetch<KnowledgeBaseMeta>(`${COMPETITIVENESS_ANALYSIS_SERVICE_PATH}/knowledge_base/meta`);
};

export const getKnowledgeBaseSources = (id: number, params: any): Promise<SourceArticleWithRecords[]> => {
    const query = createApiQuery({ ...params, with_records: true });
    return apiFetch<SourceArticleWithRecords[]>(`${COMPETITIVENESS_ANALYSIS_SERVICE_PATH}/knowledge_base/${id}/sources${query}`);
};

export const getKnowledgeBaseTraceability = (id: number, techName: string): Promise<KnowledgeBaseTraceability> => {
    const params = {
        tech_name: techName,
        include_content: false,
        min_reliability: 1
    };
    const query = createApiQuery(params);
    return apiFetch<KnowledgeBaseTraceability>(`${COMPETITIVENESS_ANALYSIS_SERVICE_PATH}/knowledge_base/${id}/traceability${query}`);
};

export const exportKnowledgeBase = async (params: any): Promise<void> => {
    const query = createApiQuery(params);
    const url = `${COMPETITIVENESS_ANALYSIS_SERVICE_PATH}/knowledge_base/export${query}`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    try {
        const response = await fetch(url, { headers });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
            throw new Error(errorData.message || '导出失败');
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        
        const disposition = response.headers.get('content-disposition');
        let filename = `knowledge_base_export_${new Date().toISOString().slice(0,10)}.csv`;
        if (disposition && disposition.indexOf('attachment') !== -1) {
            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            const matches = filenameRegex.exec(disposition);
            if (matches != null && matches[1]) { 
                filename = matches[1].replace(/['"]/g, '');
            }
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);

    } catch (error) {
        console.error("Export failed:", error);
        throw error; 
    }
};


// --- Dashboard & Stats ---

export const getDashboardOverview = (): Promise<DashboardOverview> => {
    return apiFetch<DashboardOverview>(`${COMPETITIVENESS_ANALYSIS_SERVICE_PATH}/dashboard/overview`);
};

export const getDashboardTrends = (params: any): Promise<{ series: DashboardTrendItem[] }> => {
    const query = createApiQuery(params);
    return apiFetch<{ series: DashboardTrendItem[] }>(`${COMPETITIVENESS_ANALYSIS_SERVICE_PATH}/dashboard/trends${query}`);
};

export const getDashboardDistributionBrand = (params: any): Promise<{ items: DashboardDistributionItem[] }> => {
    const query = createApiQuery(params);
    return apiFetch<{ items: DashboardDistributionItem[] }>(`${COMPETITIVENESS_ANALYSIS_SERVICE_PATH}/dashboard/distribution/brand${query}`);
};

export const getDashboardDistributionTechDimension = (params: any): Promise<{ items: DashboardDistributionItem[] }> => {
    const query = createApiQuery(params);
    return apiFetch<{ items: DashboardDistributionItem[] }>(`${COMPETITIVENESS_ANALYSIS_SERVICE_PATH}/dashboard/distribution/tech_dimension${query}`);
};

export const getDashboardDistributionSubDimension = (techDimension: string, params: any): Promise<{ items: DashboardDistributionItem[] }> => {
    const query = createApiQuery({ ...params, tech_dimension: techDimension });
    return apiFetch<{ items: DashboardDistributionItem[] }>(`${COMPETITIVENESS_ANALYSIS_SERVICE_PATH}/dashboard/distribution/sub_dimension${query}`);
};

export const getDashboardQuality = (params: any): Promise<DashboardQuality> => {
    const query = createApiQuery(params);
    return apiFetch<DashboardQuality>(`${COMPETITIVENESS_ANALYSIS_SERVICE_PATH}/dashboard/quality${query}`);
};

// --- Generic Data Query ---

export const queryData = <T>(params: any, body: any): Promise<DataQueryResponse<T>> => {
    const query = createApiQuery(params);
    return apiFetch<DataQueryResponse<T>>(`${COMPETITIVENESS_SERVICE_PATH}/data/query${query}`, {
        method: 'POST',
        body: JSON.stringify(body),
    });
};



import { COMPETITIVENESS_SERVICE_PATH, COMPETITIVENESS_ANALYSIS_SERVICE_PATH } from '../config';
import { 
    CompetitivenessStatus, TechAnalysisTask, CompetitivenessDimension, TechItem,
    // Keep legacy types for now to avoid breaking other components not yet refactored
    DashboardOverview, DashboardTrendItem, DashboardDistributionItem, DashboardQuality,
    DataQueryResponse, PaginatedResponse, KnowledgeBaseItem, KnowledgeBaseMeta,
    KnowledgeBaseDetail, SourceArticleWithRecords, KnowledgeBaseTraceability
} from '../types';
import { apiFetch, createApiQuery } from './helper';

// --- Control & Status ---

export const getCompetitivenessStatus = (): Promise<CompetitivenessStatus> => 
    apiFetch<CompetitivenessStatus>(`${COMPETITIVENESS_SERVICE_PATH}/status`);

export const toggleCompetitivenessService = (enabled: boolean): Promise<{ message: string; enabled: boolean }> =>
    apiFetch(`${COMPETITIVENESS_SERVICE_PATH}/control`, {
        method: 'POST',
        body: JSON.stringify({ enabled }),
    });

export const refreshCompetitivenessCookie = (data: { secure_1psid: string; secure_1psidts: string }): Promise<{ message: string; health: string }> =>
    apiFetch<{ message: string; health: string }>(`${COMPETITIVENESS_SERVICE_PATH}/cookie/refresh`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

// --- Data Management (Dimensions & Brands) ---

export const getDimensions = (): Promise<CompetitivenessDimension[]> =>
    apiFetch<CompetitivenessDimension[]>(`${COMPETITIVENESS_SERVICE_PATH}/dimensions`);

export const addDimension = (name: string, sub_dimensions: string[] = []): Promise<CompetitivenessDimension> =>
    apiFetch<CompetitivenessDimension>(`${COMPETITIVENESS_SERVICE_PATH}/dimensions`, {
        method: 'POST',
        body: JSON.stringify({ name, sub_dimensions }),
    });

export const updateDimension = (name: string, sub_dimensions: string[]): Promise<CompetitivenessDimension> =>
    apiFetch<CompetitivenessDimension>(`${COMPETITIVENESS_SERVICE_PATH}/dimensions/${encodeURIComponent(name)}`, {
        method: 'PUT',
        body: JSON.stringify({ sub_dimensions }),
    });

export const deleteDimension = (name: string): Promise<void> =>
    apiFetch<void>(`${COMPETITIVENESS_SERVICE_PATH}/dimensions/${encodeURIComponent(name)}`, {
        method: 'DELETE',
    });

export const getBrands = (): Promise<string[]> =>
    apiFetch<string[]>(`${COMPETITIVENESS_SERVICE_PATH}/brands`);

export const addBrand = (name: string): Promise<void> =>
    apiFetch(`${COMPETITIVENESS_SERVICE_PATH}/brands`, {
        method: 'POST',
        body: JSON.stringify({ name }),
    });

export const batchUpdateSecondaryDimension = (data: { old_name: string; new_name: string; tech_dimension?: string }): Promise<{ message: string; updated_count: number }> =>
    apiFetch(`${COMPETITIVENESS_SERVICE_PATH}/secondary-dimensions/batch-update`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

// --- Analysis ---

export const analyzeArticleStage1 = (data: { article_id: string; title?: string; content?: string }): Promise<TechAnalysisTask[]> =>
    apiFetch<TechAnalysisTask[]>(`${COMPETITIVENESS_SERVICE_PATH}/analyze/stage1`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

// --- Technical Intelligence (Stage 2) ---

export const getTechItems = (params: { skip?: number; limit?: number; vehicle_brand?: string; tech_dimension?: string }): Promise<TechItem[]> => {
    const query = createApiQuery(params);
    return apiFetch<TechItem[]>(`${COMPETITIVENESS_SERVICE_PATH}/tech-items${query}`);
}

export const getTechItemDetail = (itemId: string): Promise<TechItem> => {
    return apiFetch<TechItem>(`${COMPETITIVENESS_SERVICE_PATH}/tech-items/${itemId}`);
}


// =========================================================================================
// Legacy / Dashboard APIs (Keeping these for now to support the User Dashboard view)
// In a full refactor, these would also be updated to match the new backend structure
// or the backend would need to provide these specific endpoints.
// =========================================================================================

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
    // ... Legacy implementation
    const query = createApiQuery(params);
    const url = `${COMPETITIVENESS_ANALYSIS_SERVICE_PATH}/knowledge_base/export${query}`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('导出失败');
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `kb_export.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
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
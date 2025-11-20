import { COMPETITIVENESS_SERVICE_PATH, COMPETITIVENESS_ANALYSIS_SERVICE_PATH } from '../config';
import { 
    CompetitivenessEntity, CompetitivenessModule, BackfillJob, SystemStatus, 
    DataQueryResponse, PaginatedEntitiesResponse, PaginatedResponse, KnowledgeBaseItem,
    KnowledgeBaseDetail, KnowledgeBaseMeta, SourceArticleWithRecords, KnowledgeBaseTraceability,
    DashboardOverview, DashboardTrendItem, DashboardDistributionItem, DashboardQuality
} from '../types';
import { apiFetch, createApiQuery } from './helper';

// --- (LEGACY) Entity Management ---
export const getEntities = (params: { page?: number; size?: number; [key: string]: any }): Promise<PaginatedEntitiesResponse<CompetitivenessEntity>> => {
    const query = createApiQuery(params);
    return apiFetch<PaginatedEntitiesResponse<CompetitivenessEntity>>(`${COMPETITIVENESS_SERVICE_PATH}/entities/${query}`);
};

export const createEntity = (data: Partial<CompetitivenessEntity>): Promise<CompetitivenessEntity> =>
    apiFetch<CompetitivenessEntity>(`${COMPETITIVENESS_SERVICE_PATH}/entities`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
    
export const updateEntity = (id: string, data: Partial<CompetitivenessEntity>): Promise<CompetitivenessEntity> =>
    apiFetch<CompetitivenessEntity>(`${COMPETITIVENESS_SERVICE_PATH}/entities/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });

export const deleteEntity = (id: string): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`${COMPETITIVENESS_SERVICE_PATH}/entities/${id}`, {
        method: 'DELETE',
    });

// --- (LEGACY) Module Management ---
export const getModules = (params: any): Promise<CompetitivenessModule[]> => {
    const query = createApiQuery(params);
    return apiFetch<CompetitivenessModule[]>(`${COMPETITIVENESS_SERVICE_PATH}/modules${query}`);
};

export const createModule = (data: Partial<CompetitivenessModule>): Promise<CompetitivenessModule> =>
    apiFetch<CompetitivenessModule>(`${COMPETITIVENESS_SERVICE_PATH}/modules`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

export const updateModule = (id: string, data: Partial<CompetitivenessModule>): Promise<CompetitivenessModule> =>
    apiFetch<CompetitivenessModule>(`${COMPETITIVENESS_SERVICE_PATH}/modules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });

export const deleteModule = (id: string): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`${COMPETITIVENESS_SERVICE_PATH}/modules/${id}`, {
        method: 'DELETE',
    });


// --- (LEGACY) Data Query ---
export const queryData = <T,>(params: any, queryBody: any): Promise<DataQueryResponse<T>> => {
    const query = createApiQuery(params);
    return apiFetch<DataQueryResponse<T>>(`${COMPETITIVENESS_SERVICE_PATH}/data/query${query}`, {
        method: 'POST',
        body: JSON.stringify(queryBody),
    });
}

// --- (LEGACY) Backfill Job Management ---
export const getBackfillJobs = (params: any): Promise<BackfillJob[]> => {
    const query = createApiQuery(params);
    return apiFetch<BackfillJob[]>(`${COMPETITIVENESS_SERVICE_PATH}/backfill/jobs${query}`);
}

export const createBackfillJob = (data: any): Promise<BackfillJob> =>
    apiFetch<BackfillJob>(`${COMPETITIVENESS_SERVICE_PATH}/backfill/jobs`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

export const startBackfillJob = (jobId: string): Promise<any> =>
    apiFetch<any>(`${COMPETITIVENESS_SERVICE_PATH}/backfill/jobs/${jobId}/start`, { method: 'POST' });

export const pauseBackfillJob = (jobId: string): Promise<any> =>
    apiFetch<any>(`${COMPETITIVENESS_SERVICE_PATH}/backfill/jobs/${jobId}/pause`, { method: 'POST' });

export const getBackfillJobStatus = (jobId: string): Promise<any> =>
    apiFetch<any>(`${COMPETITIVENESS_SERVICE_PATH}/backfill/jobs/${jobId}/status`);


// --- (LEGACY) System Monitoring ---
export const getSystemStatus = (): Promise<SystemStatus> =>
    apiFetch<SystemStatus>(`${COMPETITIVENESS_SERVICE_PATH}/system/status`);

export const getSystemHealth = (): Promise<{ status: string }> =>
    apiFetch<{ status: string }>(`${COMPETITIVENESS_SERVICE_PATH}/system/health`);


// --- NEW KNOWLEDGE BASE APIs ---
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


// --- NEW DASHBOARD APIs ---

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

export const getDashboardQuality = (params: any): Promise<DashboardQuality> => {
    const query = createApiQuery(params);
    return apiFetch<DashboardQuality>(`${COMPETITIVENESS_ANALYSIS_SERVICE_PATH}/dashboard/quality${query}`);
};
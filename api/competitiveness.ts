import { COMPETITIVENESS_SERVICE_PATH } from '../config';
import { 
    CompetitivenessEntity, CompetitivenessModule, BackfillJob, SystemStatus, 
    DataQueryResponse, PaginatedEntitiesResponse 
} from '../types';
import { apiFetch, createApiQuery } from './helper';

// This response type is specific to the getEntities endpoint as per the new API doc.
interface PaginatedEntitiesResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages?: number;
}


// --- Entity Management ---
export const getEntities = (params: { page?: number; size?: number; [key: string]: any }): Promise<PaginatedEntitiesResponse<CompetitivenessEntity>> => {
    const query = createApiQuery(params);
    // Per API doc, this endpoint uses a trailing slash. e.g., /entities/?page=1&size=10
    return apiFetch<PaginatedEntitiesResponse<CompetitivenessEntity>>(`${COMPETITIVENESS_SERVICE_PATH}/entities/${query}`);
};

export const createEntity = (data: Partial<CompetitivenessEntity>): Promise<CompetitivenessEntity> =>
    // Per API doc, this endpoint does not use a trailing slash.
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

// --- Module Management ---
export const getModules = (params: any): Promise<CompetitivenessModule[]> => {
    const query = createApiQuery(params);
    // Per API doc, this endpoint does not use a trailing slash and returns an array.
    return apiFetch<CompetitivenessModule[]>(`${COMPETITIVENESS_SERVICE_PATH}/modules${query}`);
};

export const createModule = (data: Partial<CompetitivenessModule>): Promise<CompetitivenessModule> =>
    // Per API doc, this endpoint does not use a trailing slash.
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


// --- Data Query ---
// FIX: Made queryData generic to allow type-safe responses.
export const queryData = <T,>(params: any, queryBody: any): Promise<DataQueryResponse<T>> => {
    const query = createApiQuery(params);
    // Per API doc, this endpoint does not use a trailing slash.
    return apiFetch<DataQueryResponse<T>>(`${COMPETITIVENESS_SERVICE_PATH}/data/query${query}`, {
        method: 'POST',
        body: JSON.stringify(queryBody),
    });
}

// --- Backfill Job Management ---
export const getBackfillJobs = (params: any): Promise<BackfillJob[]> => {
    const query = createApiQuery(params);
    // Per API doc, this endpoint does not use a trailing slash.
    return apiFetch<BackfillJob[]>(`${COMPETITIVENESS_SERVICE_PATH}/backfill/jobs${query}`);
}

export const createBackfillJob = (data: any): Promise<BackfillJob> =>
    // Per API doc, this endpoint does not use a trailing slash.
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


// --- System Monitoring ---
export const getSystemStatus = (): Promise<SystemStatus> =>
    apiFetch<SystemStatus>(`${COMPETITIVENESS_SERVICE_PATH}/system/status`);

export const getSystemHealth = (): Promise<{ status: string }> =>
    apiFetch<{ status: string }>(`${COMPETITIVENESS_SERVICE_PATH}/system/health`);
// src/api/competitiveness.ts

import { COMPETITIVENESS_SERVICE_PATH } from '../config';
import { 
    CompetitivenessEntity, CompetitivenessModule, BackfillJob, SystemStatus, 
    DataQueryResponse, PaginatedResponse 
} from '../types';
import { apiFetch, createApiQuery } from './helper';

// --- Entity Management ---
export const getEntities = (params: { page?: number; limit?: number; [key: string]: any }): Promise<PaginatedResponse<CompetitivenessEntity>> => {
    const apiParams: { [key: string]: any } = { ...params };
    if (params.page && params.limit) {
        apiParams.offset = (params.page - 1) * params.limit;
        delete apiParams.page; // The backend expects offset, not page
    }
    const query = createApiQuery(apiParams);
    // Assuming the backend returns a paginated response like other services, even if docs are ambiguous.
    // This is necessary for proper server-side pagination.
    return apiFetch<PaginatedResponse<CompetitivenessEntity>>(`${COMPETITIVENESS_SERVICE_PATH}/entities${query}`);
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

// --- Module Management ---
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


// --- Data Query ---
export const queryData = (params: any, queryBody: any): Promise<DataQueryResponse<any>> => {
    const query = createApiQuery(params);
    return apiFetch<DataQueryResponse<any>>(`${COMPETITIVENESS_SERVICE_PATH}/data/query${query}`, {
        method: 'POST',
        body: JSON.stringify(queryBody),
    });
}

// --- Backfill Job Management ---
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


// --- System Monitoring ---
export const getSystemStatus = (): Promise<SystemStatus> =>
    apiFetch<SystemStatus>(`${COMPETITIVENESS_SERVICE_PATH}/system/status`);

export const getSystemHealth = (): Promise<{ status: string }> =>
    apiFetch<{ status: string }>(`${COMPETITIVENESS_SERVICE_PATH}/system/health`);
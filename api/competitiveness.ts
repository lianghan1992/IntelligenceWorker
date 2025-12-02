
import { COMPETITIVENESS_SERVICE_PATH } from '../config';
import { TechAnalysisTask, TechItem, CompetitivenessStatus, CompetitivenessDimension, DataQueryResponse } from '../types';
import { apiFetch, createApiQuery } from './helper';

// --- Service Status ---
export const getCompetitivenessStatus = (): Promise<CompetitivenessStatus> =>
    apiFetch<CompetitivenessStatus>(`${COMPETITIVENESS_SERVICE_PATH}/status`);

export const toggleCompetitivenessService = (enable: boolean): Promise<{ enabled: boolean }> =>
    apiFetch<{ enabled: boolean }>(`${COMPETITIVENESS_SERVICE_PATH}/control`, {
        method: 'POST',
        body: JSON.stringify({ enabled: enable }),
    });

export const refreshCompetitivenessCookie = (data: { secure_1psid: string; secure_1psidts: string }): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`${COMPETITIVENESS_SERVICE_PATH}/cookie/refresh`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

// --- Metadata ---
export const getDimensions = (): Promise<CompetitivenessDimension[]> =>
    apiFetch<CompetitivenessDimension[]>(`${COMPETITIVENESS_SERVICE_PATH}/dimensions`);

export const addDimension = (name: string, sub_dimensions: string[]): Promise<CompetitivenessDimension> =>
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

export const addBrand = (name: string): Promise<{ name: string }> =>
    apiFetch<{ name: string }>(`${COMPETITIVENESS_SERVICE_PATH}/brands`, {
        method: 'POST',
        body: JSON.stringify({ name }),
    });

export const batchUpdateSecondaryDimension = (data: any): Promise<any> =>
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

export const getTechItems = (params: { skip?: number; limit?: number; vehicle_brand?: string; tech_dimension?: string; only_reviewed?: boolean }): Promise<TechItem[]> => {
    const query = createApiQuery(params);
    return apiFetch<TechItem[]>(`${COMPETITIVENESS_SERVICE_PATH}/tech-items${query}`);
}

export const getTechItemDetail = (itemId: string): Promise<TechItem> => {
    return apiFetch<TechItem>(`${COMPETITIVENESS_SERVICE_PATH}/tech-items/${itemId}`);
}

// --- Generic Data Query (for Dashboards) ---
export const queryData = <T>(params: any, body: any): Promise<DataQueryResponse<T>> => {
    const query = createApiQuery(params);
    return apiFetch<DataQueryResponse<T>>(`${COMPETITIVENESS_SERVICE_PATH}/data/query${query}`, {
        method: 'POST',
        body: JSON.stringify(body),
    });
};

// --- Review Process ---

export const getPendingReviews = (params: { skip?: number; limit?: number; vehicle_brand?: string; tech_dimension?: string }): Promise<{ items: TechItem[], total: number }> => {
    const query = createApiQuery(params);
    return apiFetch<{ items: TechItem[], total: number }>(`${COMPETITIVENESS_SERVICE_PATH}/reviews/pending${query}`);
}

export const approveReviewItem = (itemId: string): Promise<TechItem> => {
    return apiFetch<TechItem>(`${COMPETITIVENESS_SERVICE_PATH}/reviews/${itemId}/approve`, {
        method: 'POST'
    });
}

export const rejectReviewItems = (itemIds: string[]): Promise<void> => {
    return apiFetch<void>(`${COMPETITIVENESS_SERVICE_PATH}/reviews/items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_ids: itemIds })
    });
}


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

export const getCompetitivenessStats = async (type: 'overview' | 'by-brand' | 'by-dimension' | 'reliability' | 'recent'): Promise<any> =>
    apiFetch<any>(`${COMPETITIVENESS_SERVICE_PATH}/stats/${type}`);

// --- Metadata ---
export const getDimensions = async (params: { page?: number; size?: number; limit?: number } = { page: 1, size: 1000 }): Promise<CompetitivenessDimension[]> => {
    const query = createApiQuery(params);
    const res = await apiFetch<{ items: CompetitivenessDimension[] }>(`${COMPETITIVENESS_SERVICE_PATH}/dimensions${query}`);
    return res.items;
};

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

export const getBrands = async (params: { page?: number; size?: number; limit?: number } = { page: 1, size: 1000 }): Promise<string[]> => {
    const query = createApiQuery(params);
    const res = await apiFetch<{ items: { name: string }[] }>(`${COMPETITIVENESS_SERVICE_PATH}/brands${query}`);
    return res.items.map(i => i.name);
};

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

export const getTechItems = async (params: { skip?: number; limit?: number; page?: number; size?: number; vehicle_brand?: string; tech_dimension?: string; only_reviewed?: boolean }): Promise<{ items: TechItem[], total: number }> => {
    const apiParams: any = { ...params };
    
    // Logic: If 'skip' is used, calculate 'page'. 
    // BUT we must preserve 'limit' if it exists so the backend overrides the default size=20.
    if (apiParams.skip !== undefined && apiParams.limit) {
        apiParams.page = Math.floor(apiParams.skip / apiParams.limit) + 1;
        delete apiParams.skip;
        // Do NOT delete apiParams.limit here. 
        // The backend explicitly checks for 'limit' for backward compatibility.
    }
    
    const query = createApiQuery(apiParams);
    const res = await apiFetch<{ items: TechItem[], total: number }>(`${COMPETITIVENESS_SERVICE_PATH}/tech-items${query}`);
    return res;
}

export const getTechItemDetail = (itemId: string): Promise<TechItem> => {
    return apiFetch<TechItem>(`${COMPETITIVENESS_SERVICE_PATH}/tech-items/${itemId}`);
}

export const batchDeleteTechItems = (ids: string[]): Promise<void> => {
    return apiFetch<void>(`${COMPETITIVENESS_SERVICE_PATH}/tech-items/batch-delete`, {
        method: 'POST',
        body: JSON.stringify({ ids })
    });
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

export const getPendingReviews = (params: { skip?: number; limit?: number; page?: number; size?: number; vehicle_brand?: string; tech_dimension?: string }): Promise<{ items: TechItem[], total: number }> => {
    const apiParams: any = { ...params };
    if (apiParams.skip !== undefined && apiParams.limit) {
        apiParams.page = Math.floor(apiParams.skip / apiParams.limit) + 1;
        delete apiParams.skip;
        // Keep limit if present
    }
    const query = createApiQuery(apiParams);
    return apiFetch<{ items: TechItem[], total: number }>(`${COMPETITIVENESS_SERVICE_PATH}/reviews/pending${query}`);
}

export const approveReviewItem = (itemId: string): Promise<TechItem> => {
    return apiFetch<TechItem>(`${COMPETITIVENESS_SERVICE_PATH}/reviews/${itemId}/approve`, {
        method: 'POST'
    });
}

export const rejectReviewItems = (itemIds: string[]): Promise<void> => {
    return batchDeleteTechItems(itemIds);
}

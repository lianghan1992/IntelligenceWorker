// src/api/intelligence.ts

import { INTELLIGENCE_SERVICE_PATH } from '../config';
import { 
    Subscription, InfoItem, SystemSource, PaginatedResponse, 
    SearchResult, IntelligenceTask,
   SearchChunksResponse, ExportChunksResponse
} from '../types';
import { apiFetch, createApiQuery } from './helper';
import { getUserSubscribedSources } from './user';

// --- Intelligence Points & Sources API ---
export const getSubscriptions = async (): Promise<Subscription[]> => {
    const subscribedSources = await getUserSubscribedSources();
    if (subscribedSources.length === 0) {
        return [];
    }
    const pointsPromises = subscribedSources.map(source => 
        getPointsBySourceName(source.source_name)
    );
    const pointsBySource = await Promise.all(pointsPromises);
    return pointsBySource.flat();
};

export const getSources = (): Promise<SystemSource[]> => apiFetch<SystemSource[]>(`${INTELLIGENCE_SERVICE_PATH}/sources`);

export const deleteSource = (sourceName: string): Promise<void> => 
    apiFetch<void>(`${INTELLIGENCE_SERVICE_PATH}/sources/${encodeURIComponent(sourceName)}`, { method: 'DELETE' });

export const getPointsBySourceName = (sourceName: string): Promise<Subscription[]> =>
    apiFetch<Subscription[]>(`${INTELLIGENCE_SERVICE_PATH}/points${createApiQuery({ source_name: sourceName })}`);
    
export const createIntelligencePoint = (data: Partial<Subscription>): Promise<{ message: string, point_id: string }> => 
    apiFetch<{ message: string, point_id: string }>(`${INTELLIGENCE_SERVICE_PATH}/points`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

export const deleteIntelligencePoints = (pointIds: string[]): Promise<void> => 
    apiFetch<void>(`${INTELLIGENCE_SERVICE_PATH}/points`, {
        method: 'DELETE',
        body: JSON.stringify({ point_ids: pointIds }),
    });

// --- Articles / InfoItems API ---
export const searchArticles = (query: string, pointIds: string[], top_k: number): Promise<InfoItem[]> =>
    apiFetch<InfoItem[]>(`${INTELLIGENCE_SERVICE_PATH}/search/articles${createApiQuery({ top_k })}`, {
        method: 'POST',
        body: JSON.stringify({ query_text: query, point_ids: pointIds }),
    });

export const searchArticlesFiltered = (params: any): Promise<PaginatedResponse<SearchResult>> => {
    const { query_text, ...restParams } = params;
    const isSemanticSearch = query_text && query_text.trim() !== '' && query_text.trim() !== '*';

    // Calls with `query_text` are likely semantic searches. We'll leave them pointed 
    // at the old endpoint for now to avoid breaking other parts of the application,
    // as the documented `/search/combined` endpoint has a different signature.
    if (isSemanticSearch) {
        return apiFetch<PaginatedResponse<SearchResult>>(`${INTELLIGENCE_SERVICE_PATH}/search/articles_filtered`, {
            method: 'POST',
            body: JSON.stringify(params), // Send original params
        });
    }

    // Calls without `query_text` are simple filtered searches (e.g., from the dashboard).
    // We'll point them to the correct `/articles` endpoint as documented.
    // This endpoint expects a payload like `{ filters: { ... }, page: 1, limit: 20 }`.
    return apiFetch<PaginatedResponse<SearchResult>>(`${INTELLIGENCE_SERVICE_PATH}/articles`, {
        method: 'POST',
        body: JSON.stringify(restParams), // Send params without query_text
    });
};

export const processUrlToInfoItem = (url: string, setFeedback: (msg: string) => void): Promise<InfoItem> => {
    setFeedback('正在抓取URL内容...');
    return new Promise(resolve => setTimeout(() => {
        setFeedback('分析内容并提取关键信息...');
        resolve(apiFetch<InfoItem>(`${INTELLIGENCE_SERVICE_PATH}/process_url`, {
            method: 'POST',
            body: JSON.stringify({ url }),
        }));
    }, 1500));
};

// --- Chunk Search API ---
export const searchChunks = (params: any): Promise<SearchChunksResponse> =>
    apiFetch<SearchChunksResponse>(`${INTELLIGENCE_SERVICE_PATH}/search/chunks`, {
        method: 'POST',
        body: JSON.stringify(params),
    });

export const exportChunks = (params: any): Promise<ExportChunksResponse> =>
    apiFetch<ExportChunksResponse>(`${INTELLIGENCE_SERVICE_PATH}/search/chunks/export`, {
        method: 'POST',
        body: JSON.stringify(params),
    });


// --- Intelligence Tasks (formerly Crawler Tasks) API ---
export const getIntelligenceTasks = (params: any): Promise<PaginatedResponse<IntelligenceTask>> => {
    const query = createApiQuery(params);
    return apiFetch<PaginatedResponse<IntelligenceTask>>(`${INTELLIGENCE_SERVICE_PATH}/tasks${query}`);
};
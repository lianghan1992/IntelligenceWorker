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
    // Per inspection of multiple components, the working pattern is to use
    // the '/search/articles_filtered' endpoint with a flat parameter structure.
    // This simplifies the logic and aligns all calls to the same working endpoint.
    return apiFetch<PaginatedResponse<SearchResult>>(`${INTELLIGENCE_SERVICE_PATH}/search/articles_filtered`, {
        method: 'POST',
        body: JSON.stringify(params),
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
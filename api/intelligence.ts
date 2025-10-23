// src/api/intelligence.ts

import { INTELLIGENCE_SERVICE_PATH } from '../config';
import { 
    Subscription, InfoItem, SystemSource, PaginatedResponse, 
    AllPrompts, SearchResult, IntelligenceTask 
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
    apiFetch<Subscription[]>(`${INTELLIGENCE_SERVICE_PATH}/points?source_name=${encodeURIComponent(sourceName)}`);
    
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
    apiFetch<InfoItem[]>(`${INTELLIGENCE_SERVICE_PATH}/search/articles?top_k=${top_k}`, {
        method: 'POST',
        body: JSON.stringify({ query_text: query, point_ids: pointIds }),
    });

export const searchArticlesFiltered = (params: any): Promise<PaginatedResponse<SearchResult>> =>
    apiFetch<PaginatedResponse<SearchResult>>(`${INTELLIGENCE_SERVICE_PATH}/search/articles_filtered`, {
        method: 'POST',
        body: JSON.stringify(params),
    });

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

// --- Prompts API ---
export const getAllPrompts = (): Promise<AllPrompts> => apiFetch<AllPrompts>(`${INTELLIGENCE_SERVICE_PATH}/prompts`);

// --- Intelligence Tasks (formerly Crawler Tasks) API ---
export const getIntelligenceTasks = (params: any): Promise<PaginatedResponse<IntelligenceTask>> => {
    const query = createApiQuery(params);
    return apiFetch<PaginatedResponse<IntelligenceTask>>(`${INTELLIGENCE_SERVICE_PATH}/tasks?${query}`);
};

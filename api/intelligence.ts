
// src/api/intelligence.ts

import { INTELLIGENCE_SERVICE_PATH } from '../config';
import { 
    Subscription, InfoItem, SystemSource, PaginatedResponse, 
    SearchResult,
   SearchChunksResponse, ExportChunksResponse, LlmSearchRequest, LlmSearchResponse,
   LlmSearchTasksResponse, LlmSearchTaskDetail,
   GenericPoint, GenericTask, PendingArticle, SourceWithPoints
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

export const getSourceNames = (): Promise<string[]> => apiFetch<string[]>(`${INTELLIGENCE_SERVICE_PATH}/sources/names`);

export const getSourcesAndPoints = (): Promise<SourceWithPoints[]> =>
    apiFetch<SourceWithPoints[]>(`${INTELLIGENCE_SERVICE_PATH}/sources-and-points`);

// Updated: Delete source by name
export const deleteSource = (sourceName: string): Promise<void> => 
    apiFetch<void>(`${INTELLIGENCE_SERVICE_PATH}/sources/${encodeURIComponent(sourceName)}`, { method: 'DELETE' });

export const getPointsBySourceName = (sourceName: string): Promise<Subscription[]> =>
    apiFetch<Subscription[]>(`${INTELLIGENCE_SERVICE_PATH}/points${createApiQuery({ source_name: sourceName })}`);
    
export const createIntelligencePoint = (data: Partial<Subscription>): Promise<{ message: string, point_id: string }> => 
    apiFetch<{ message: string, point_id: string }>(`${INTELLIGENCE_SERVICE_PATH}/points`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

// Updated: Batch delete points with body
// Fix: Explicitly set Content-Type for DELETE with body to avoid 422
export const deleteIntelligencePoints = (pointIds: string[]): Promise<void> => 
    apiFetch<void>(`${INTELLIGENCE_SERVICE_PATH}/points`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ point_ids: pointIds }),
    });

// NEW: Toggle point status
export const toggleIntelligencePoint = (pointId: string, enable: boolean): Promise<{ success: boolean, message: string }> =>
    apiFetch<{ success: boolean, message: string }>(`${INTELLIGENCE_SERVICE_PATH}/points/${pointId}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ enable }),
    });

// NEW: Toggle all points in a source
export const toggleSource = (sourceName: string, enable: boolean): Promise<{ success: boolean, message: string }> =>
    apiFetch<{ success: boolean, message: string }>(`${INTELLIGENCE_SERVICE_PATH}/sources/${encodeURIComponent(sourceName)}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ enable }),
    });

// NEW: Check point health
export const checkIntelligencePointHealth = (pointId: string): Promise<{ status: string, message: string, last_success_time?: string }> =>
    apiFetch<{ status: string, message: string, last_success_time?: string }>(`${INTELLIGENCE_SERVICE_PATH}/points/${pointId}/health`);

// NEW: Run crawler immediately (Source Level)
export const runCrawler = (sourceName: string): Promise<{ message: string; source_name: string; module_path: string }> =>
    apiFetch<{ message: string; source_name: string; module_path: string }>(`${INTELLIGENCE_SERVICE_PATH}/crawlers/${encodeURIComponent(sourceName)}/run-now`, {
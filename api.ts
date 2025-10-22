// src/api.ts

import {
    USER_SERVICE_PATH,
    INTELLIGENCE_SERVICE_PATH,
    LIVESTREAM_SERVICE_PATH
} from './config';
import { 
    User, 
    Subscription, 
    InfoItem, 
    SystemSource, 
    ApiPoi,
    PlanDetails,
    LivestreamTask,
    LivestreamPrompt,
    AdminUser,
    ApiProcessingTask
} from './types';

// --- Helper Functions ---

// A generic API fetch function to handle headers, errors, and token automatically
async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    const token = localStorage.getItem('accessToken');
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    if (!(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        // Unauthorized, likely expired token
        localStorage.removeItem('accessToken');
        window.location.reload(); // Force a reload to go back to the login page
        // Throw an error to stop the current execution flow
        throw new Error('Session expired. Please log in again.');
    }
    
    if (!response.ok) {
        // Try to parse error message from backend, otherwise use status text
        let errorMessage = `HTTP error! status: ${response.status} ${response.statusText}`;
        try {
            const errorBody = await response.json();
            errorMessage = errorBody.message || errorBody.detail || errorMessage;
        } catch (e) {
            // Not a JSON response, stick with the original error
        }
        throw new Error(errorMessage);
    }
    
    if (response.status === 204) { // No Content
        return null as T;
    }

    return response.json() as Promise<T>;
}


// --- User & Auth Service ---

export const login = (email: string, password: string): Promise<{ token: string; user: User }> =>
    apiFetch(`${USER_SERVICE_PATH}/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });

export const register = (username: string, email: string, password: string): Promise<User> =>
    apiFetch(`${USER_SERVICE_PATH}/register`, {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
    });

export const getMe = (): Promise<User> => apiFetch(`${USER_SERVICE_PATH}/me`);

export const getUsers = (): Promise<AdminUser[]> => apiFetch(`${USER_SERVICE_PATH}/`);

export const getPlans = (): Promise<PlanDetails> => apiFetch(`${USER_SERVICE_PATH}/plans`);

// POIs (Points of Interest)
export const getUserPois = (): Promise<ApiPoi[]> => apiFetch(`${USER_SERVICE_PATH}/me/pois`);
export const addUserPoi = (poi: { content: string; keywords: string }): Promise<ApiPoi> =>
    apiFetch(`${USER_SERVICE_PATH}/me/pois`, {
        method: 'POST',
        body: JSON.stringify(poi),
    });
export const deleteUserPoi = (poiId: string): Promise<void> =>
    apiFetch(`${USER_SERVICE_PATH}/me/pois/${poiId}`, { method: 'DELETE' });

// User Source Subscriptions
export const getUserSubscribedSources = (): Promise<{id: string, source_name: string}[]> => apiFetch(`${USER_SERVICE_PATH}/me/sources`);
export const addUserSourceSubscription = (sourceId: string): Promise<void> =>
    apiFetch(`${USER_SERVICE_PATH}/me/sources/${sourceId}`, { method: 'POST' });
export const deleteUserSourceSubscription = (sourceId: string): Promise<void> =>
    apiFetch(`${USER_SERVICE_PATH}/me/sources/${sourceId}`, { method: 'DELETE' });


// --- Intelligence Service ---

export const getSubscriptions = (): Promise<Subscription[]> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/subscriptions`);

export const getSources = (): Promise<SystemSource[]> => apiFetch(`${INTELLIGENCE_SERVICE_PATH}/sources`);

export const getPointsBySourceName = (sourceName: string): Promise<Subscription[]> => apiFetch(`${INTELLIGENCE_SERVICE_PATH}/points/source/${encodeURIComponent(sourceName)}`);

interface PaginatedResponse<T> {
    items: T[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export const searchArticlesFiltered = (params: {
    query_text: string,
    point_ids?: string[],
    page?: number,
    limit?: number
}): Promise<PaginatedResponse<InfoItem>> => {
    const queryParams = new URLSearchParams({
        query_text: params.query_text,
        page: (params.page || 1).toString(),
        limit: (params.limit || 50).toString(),
    });
    if (params.point_ids) {
        params.point_ids.forEach(id => queryParams.append('point_ids', id));
    }
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/articles/search?${queryParams.toString()}`);
};


// This function seems to be for a simpler, non-paginated search for counts.
export const searchArticles = async (query: string, pointIds: string[], limit: number): Promise<InfoItem[]> => {
    const result = await searchArticlesFiltered({ query_text: query, point_ids: pointIds, limit, page: 1 });
    return result.items;
};


// This function is for manually triggering processing of a URL.
export const processUrlToInfoItem = async (url: string, setFeedback: (msg: string) => void): Promise<InfoItem> => {
    setFeedback("正在提交URL进行分析...");
    const response = await apiFetch<{ task_id: string }>(`${INTELLIGENCE_SERVICE_PATH}/process/url`, {
        method: 'POST',
        body: JSON.stringify({ url }),
    });

    const taskId = response.task_id;
    setFeedback("任务已创建，正在等待处理结果...");
    
    // Polling for the result
    return new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
            try {
                const taskResult = await apiFetch<ApiProcessingTask>(`${INTELLIGENCE_SERVICE_PATH}/tasks/${taskId}`);
                if (taskResult.status === 'completed') {
                    clearInterval(interval);
                    setFeedback("处理完成！");
                    // Assuming the payload is the InfoItem ID
                    const infoItemId = JSON.parse(taskResult.payload!).info_item_id;
                    const infoItem = await apiFetch<InfoItem>(`${INTELLIGENCE_SERVICE_PATH}/articles/${infoItemId}`);
                    resolve(infoItem);
                } else if (taskResult.status === 'failed') {
                    clearInterval(interval);
                    reject(new Error(JSON.parse(taskResult.payload!).error || "处理失败"));
                }
                // else still processing, just wait for next poll
            } catch (err) {
                clearInterval(interval);
                reject(err);
            }
        }, 3000);
    });
};


// --- Livestream Analysis Service ---

export const getLivestreamTasks = (params: {
    page?: number;
    limit?: number;
    status?: string;
    search_term?: string;
    sort_by?: string;
    order?: string;
} = {}): Promise<PaginatedResponse<LivestreamTask>> => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.status) queryParams.set('status', params.status);
    if (params.search_term) queryParams.set('search_term', params.search_term);
    if (params.sort_by) queryParams.set('sort_by', params.sort_by);
    if (params.order) queryParams.set('order', params.order);
    return apiFetch(`${LIVESTREAM_SERVICE_PATH}/tasks?${queryParams.toString()}`);
};

export const getLivestreamTasksStats = (): Promise<any> => apiFetch(`${LIVESTREAM_SERVICE_PATH}/tasks/stats`);

export const createLivestreamTask = (data: {
    url: string;
    livestream_name: string;
    entity: string;
    start_time: string;
    prompt_file: string;
    image?: File;
}): Promise<LivestreamTask> => {
    const formData = new FormData();
    formData.append('url', data.url);
    formData.append('livestream_name', data.livestream_name);
    formData.append('entity', data.entity);
    formData.append('start_time', data.start_time);
    formData.append('prompt_file', data.prompt_file);
    if (data.image) {
        formData.append('image', data.image);
    }
    return apiFetch(`${LIVESTREAM_SERVICE_PATH}/tasks`, {
        method: 'POST',
        body: formData,
    });
};

export const createHistoryLivestreamTask = (data: {
    url: string;
    livestream_name: string;
    entity: string;
    host_name: string;
    start_time: string;
    summary_report: string;
    livestream_image?: string; // base64 string
}): Promise<LivestreamTask> => {
    return apiFetch(`${LIVESTREAM_SERVICE_PATH}/tasks/history`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const deleteLivestreamTask = (taskId: string): Promise<void> =>
    apiFetch(`${LIVESTREAM_SERVICE_PATH}/tasks/${taskId}`, { method: 'DELETE' });

export const startListenTask = (taskId: string): Promise<void> =>
    apiFetch(`${LIVESTREAM_SERVICE_PATH}/tasks/${taskId}/start`, { method: 'POST' });

export const stopListenTask = (taskId: string): Promise<void> =>
    apiFetch(`${LIVESTREAM_SERVICE_PATH}/tasks/${taskId}/stop`, { method: 'POST' });

export const getLivestreamPrompts = (): Promise<LivestreamPrompt[]> =>
    apiFetch(`${LIVESTREAM_SERVICE_PATH}/prompts`);

export const updateLivestreamPrompt = (name: string, content: string): Promise<LivestreamPrompt> =>
    apiFetch(`${LIVESTREAM_SERVICE_PATH}/prompts/${name}`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
    });

// src/api.ts
import { 
    USER_SERVICE_PATH, 
    INTELLIGENCE_SERVICE_PATH, 
    LIVESTREAM_SERVICE_PATH 
} from './config';
import { 
    User, Subscription, InfoItem, PlanDetails, ApiPoi, SystemSource, 
    LivestreamTask, PaginatedResponse, LivestreamPrompt, AllPrompts,
    SearchResult, CrawlerTask
} from './types';

// --- Generic API Fetch Helper ---
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
        localStorage.removeItem('accessToken');
        window.location.reload();
        throw new Error('认证失败，请重新登录。');
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
        throw new Error(errorData.message || '请求失败');
    }
    
    // Handle cases where response might be empty
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return response.json();
    }
    // Assuming empty response is OK for some requests (e.g. DELETE)
    return {} as T;
}

// --- Auth API ---
export const login = (email: string, password: string): Promise<{ accessToken: string; user: User }> =>
    apiFetch<{ accessToken: string; user: User }>(`${USER_SERVICE_PATH}/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });

export const register = (username: string, email: string, password: string): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`${USER_SERVICE_PATH}/register`, {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
    });

export const getMe = (): Promise<User> => apiFetch<User>(`${USER_SERVICE_PATH}/me`);

// --- Plans API ---
export const getPlans = (): Promise<PlanDetails> => apiFetch<PlanDetails>(`${USER_SERVICE_PATH}/plans`);

// --- Intelligence Points & Sources API ---
export const getSubscriptions = (): Promise<Subscription[]> => apiFetch<Subscription[]>(`${INTELLIGENCE_SERVICE_PATH}/subscriptions`);
export const getSources = (): Promise<SystemSource[]> => apiFetch<SystemSource[]>(`${INTELLIGENCE_SERVICE_PATH}/sources`);
export const deleteSource = (sourceName: string): Promise<void> => 
    apiFetch<void>(`${INTELLIGENCE_SERVICE_PATH}/sources/${encodeURIComponent(sourceName)}`, { method: 'DELETE' });

export const getPointsBySourceName = (sourceName: string): Promise<Subscription[]> =>
    apiFetch<Subscription[]>(`${INTELLIGENCE_SERVICE_PATH}/points/by_source/${encodeURIComponent(sourceName)}`);
    
export const createIntelligencePoint = (data: Partial<Subscription>): Promise<Subscription> => 
    apiFetch<Subscription>(`${INTELLIGENCE_SERVICE_PATH}/points`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

export const deleteIntelligencePoints = (pointIds: string[]): Promise<void> => 
    apiFetch<void>(`${INTELLIGENCE_SERVICE_PATH}/points`, {
        method: 'DELETE',
        body: JSON.stringify({ point_ids: pointIds }),
    });

// --- User POIs (Focus Points) ---
export const getUserPois = (): Promise<ApiPoi[]> => apiFetch<ApiPoi[]>(`${USER_SERVICE_PATH}/pois`);
export const addUserPoi = (data: { content: string; keywords: string }): Promise<ApiPoi> =>
    apiFetch<ApiPoi>(`${USER_SERVICE_PATH}/pois`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
export const deleteUserPoi = (poiId: string): Promise<void> => apiFetch<void>(`${USER_SERVICE_PATH}/pois/${poiId}`, { method: 'DELETE' });

// --- User Source Subscriptions ---
export const getUserSubscribedSources = (): Promise<SystemSource[]> => apiFetch<SystemSource[]>(`${USER_SERVICE_PATH}/sources`);
export const addUserSourceSubscription = (sourceId: string): Promise<void> => 
    apiFetch<void>(`${USER_SERVICE_PATH}/sources`, {
        method: 'POST',
        body: JSON.stringify({ source_id: sourceId }),
    });
export const deleteUserSourceSubscription = (sourceId: string): Promise<void> => 
    apiFetch<void>(`${USER_SERVICE_PATH}/sources/${sourceId}`, { method: 'DELETE' });

// --- Articles / InfoItems API ---
export const searchArticles = (query: string, pointIds: string[], limit: number): Promise<InfoItem[]> =>
    apiFetch<PaginatedResponse<InfoItem>>(`${INTELLIGENCE_SERVICE_PATH}/search`, {
        method: 'POST',
        body: JSON.stringify({ query_text: query, point_ids: pointIds, limit }),
    }).then((res) => res.items);

export const searchArticlesFiltered = (params: any): Promise<PaginatedResponse<SearchResult>> =>
    apiFetch<PaginatedResponse<SearchResult>>(`${INTELLIGENCE_SERVICE_PATH}/search`, {
        method: 'POST',
        body: JSON.stringify(params),
    });

export const processUrlToInfoItem = (url: string, setFeedback: (msg: string) => void): Promise<InfoItem> => {
    // This is a complex operation, mocking the feedback mechanism
    setFeedback('正在抓取URL内容...');
    return new Promise(resolve => setTimeout(() => {
        setFeedback('分析内容并提取关键信息...');
        resolve(apiFetch<InfoItem>(`${INTELLIGENCE_SERVICE_PATH}/process_url`, {
            method: 'POST',
            body: JSON.stringify({ url }),
        }));
    }, 1500));
};

// --- Livestream / Events API ---
export const getLivestreamTasks = (params: any): Promise<PaginatedResponse<LivestreamTask>> => {
    const query = new URLSearchParams(params).toString();
    return apiFetch<PaginatedResponse<LivestreamTask>>(`${LIVESTREAM_SERVICE_PATH}/tasks?${query}`);
};
export const getLivestreamTasksStats = (): Promise<any> => apiFetch<any>(`${LIVESTREAM_SERVICE_PATH}/tasks/stats`);

export const createLivestreamTask = (data: { url: string; livestream_name: string; entity: string; start_time: string; prompt_file: string; image?: File }): Promise<LivestreamTask> => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
        if (key === 'image' && value) {
            formData.append(key, value as File);
        } else if (value !== null && value !== undefined) {
            formData.append(key, value as string);
        }
    });
    return apiFetch<LivestreamTask>(`${LIVESTREAM_SERVICE_PATH}/tasks`, { method: 'POST', body: formData });
};

export const createHistoryLivestreamTask = (data: { url: string; livestream_name: string; entity: string; start_time: string; summary_report: string; host_name: string; livestream_image?: string; }): Promise<LivestreamTask> => {
     return apiFetch<LivestreamTask>(`${LIVESTREAM_SERVICE_PATH}/tasks/history`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const deleteLivestreamTask = (taskId: string): Promise<void> => apiFetch<void>(`${LIVESTREAM_SERVICE_PATH}/tasks/${taskId}`, { method: 'DELETE' });
export const startListenTask = (taskId: string): Promise<void> => apiFetch<void>(`${LIVESTREAM_SERVICE_PATH}/tasks/${taskId}/start`, { method: 'POST' });
export const stopListenTask = (taskId: string): Promise<void> => apiFetch<void>(`${LIVESTREAM_SERVICE_PATH}/tasks/${taskId}/stop`, { method: 'POST' });

// --- Prompts API ---
export const getLivestreamPrompts = (): Promise<LivestreamPrompt[]> => apiFetch<LivestreamPrompt[]>(`${LIVESTREAM_SERVICE_PATH}/prompts`);
export const updateLivestreamPrompt = (name: string, content: string): Promise<void> =>
    apiFetch<void>(`${LIVESTREAM_SERVICE_PATH}/prompts/${name}`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
    });

export const getAllPrompts = (): Promise<AllPrompts> => apiFetch<AllPrompts>(`${INTELLIGENCE_SERVICE_PATH}/prompts`);

// --- Crawler Tasks API ---
export const getCrawlerTasks = (params: any): Promise<PaginatedResponse<CrawlerTask>> => {
    const query = new URLSearchParams(params).toString();
    return apiFetch<PaginatedResponse<CrawlerTask>>(`${INTELLIGENCE_SERVICE_PATH}/crawler_tasks?${query}`);
};
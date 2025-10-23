import { 
    USER_SERVICE_PATH, 
    INTELLIGENCE_SERVICE_PATH, 
    LIVESTREAM_SERVICE_PATH 
} from './config';
import { 
    User, Subscription, InfoItem, PlanDetails, ApiPoi, SystemSource, 
    LivestreamTask, PaginatedResponse, LivestreamPrompt, AllPrompts,
    SearchResult, IntelligenceTask, UserListItem, UserForAdminUpdate
} from './types';

// --- Generic API Fetch Helper ---
async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    const token = localStorage.getItem('accessToken');
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    if (!(options.body instanceof FormData) && options.method !== 'GET' && options.method !== 'DELETE') {
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
    
    // Handle cases where response might be empty (e.g., 204 No Content)
    if (response.status === 204) {
        return {} as T;
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return response.json();
    }
    
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

// --- User Management API (Admin) ---
export const getUsers = (params: any): Promise<PaginatedResponse<UserListItem>> => {
    // Filter out null or undefined params before creating query string
    const filteredParams = Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null && v !== ''));
    // FIX: Cast `filteredParams` to `Record<string, string>` to satisfy the `URLSearchParams` constructor's type requirements.
    const query = new URLSearchParams(filteredParams as Record<string, string>).toString();
    return apiFetch<PaginatedResponse<UserListItem>>(`${USER_SERVICE_PATH}/?${query}`);
}

export const updateUser = (userId: string, data: UserForAdminUpdate): Promise<UserListItem> => 
    apiFetch<UserListItem>(`${USER_SERVICE_PATH}/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });

export const deleteUser = (userId: string): Promise<void> =>
    apiFetch<void>(`${USER_SERVICE_PATH}/${userId}`, {
        method: 'DELETE',
    });


// --- Plans API ---
export const getPlans = (): Promise<PlanDetails> => apiFetch<PlanDetails>(`${USER_SERVICE_PATH}/plans`);

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

// --- User POIs (Focus Points) ---
export const getUserPois = (): Promise<ApiPoi[]> => apiFetch<ApiPoi[]>(`${USER_SERVICE_PATH}/me/pois`);

export const addUserPoi = (data: { content: string; keywords: string }): Promise<ApiPoi> =>
    apiFetch<ApiPoi>(`${USER_SERVICE_PATH}/me/pois`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

export const deleteUserPoi = (poiId: string): Promise<void> => apiFetch<void>(`${USER_SERVICE_PATH}/me/pois/${poiId}`, { method: 'DELETE' });

// --- User Source Subscriptions ---
export const getUserSubscribedSources = (): Promise<SystemSource[]> => apiFetch<SystemSource[]>(`${USER_SERVICE_PATH}/me/sources`);

export const addUserSourceSubscription = (sourceId: string): Promise<void> => 
    apiFetch<void>(`${USER_SERVICE_PATH}/me/sources/${sourceId}`, {
        method: 'POST',
    });

export const deleteUserSourceSubscription = (sourceId: string): Promise<void> => 
    apiFetch<void>(`${USER_SERVICE_PATH}/me/sources/${sourceId}`, { method: 'DELETE' });


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

const createApiQuery = (params: any): string => {
    // Filter out null, undefined, or empty string values from the parameters
    const filteredParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== '')
    );
    return new URLSearchParams(filteredParams as Record<string, string>).toString();
}

// --- Livestream / Events API ---
export const getLivestreamTasks = (params: any): Promise<PaginatedResponse<LivestreamTask>> => {
    const query = createApiQuery(params);
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
export const startListenTask = (taskId: string): Promise<void> => apiFetch<void>(`${LIVESTREAM_SERVICE_PATH}/tasks/${taskId}/listen/start`, { method: 'POST' });
export const stopListenTask = (taskId: string): Promise<void> => apiFetch<void>(`${LIVESTREAM_SERVICE_PATH}/tasks/${taskId}/listen/stop`, { method: 'POST' });

// --- Prompts API ---
export const getLivestreamPrompts = (): Promise<LivestreamPrompt[]> => apiFetch<LivestreamPrompt[]>(`${LIVESTREAM_SERVICE_PATH}/prompts`);
export const updateLivestreamPrompt = (name: string, content: string): Promise<void> =>
    apiFetch<void>(`${LIVESTREAM_SERVICE_PATH}/prompts/${name}`, {
        method: 'POST', // API Doc uses POST for update
        body: JSON.stringify({ content }),
    });

export const getAllPrompts = (): Promise<AllPrompts> => apiFetch<AllPrompts>(`${INTELLIGENCE_SERVICE_PATH}/prompts`);

// --- Intelligence Tasks (formerly Crawler Tasks) API ---
export const getIntelligenceTasks = (params: any): Promise<PaginatedResponse<IntelligenceTask>> => {
    const query = createApiQuery(params);
    return apiFetch<PaginatedResponse<IntelligenceTask>>(`${INTELLIGENCE_SERVICE_PATH}/tasks?${query}`);
};
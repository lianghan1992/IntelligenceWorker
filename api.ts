// src/api.ts

import { API_BASE_URL, INTELLIGENCE_SERVICE_PATH, USER_SERVICE_PATH } from './config';
import { 
    User, 
    AdminUser,
    InfoItem, 
    Subscription, 
    SystemSource, 
    ApiPoi,
    PlanDetails,
    ApiProcessingTask,
    ApiTask,
    AllPrompts,
    SearchResult,
    Prompt,
    AppEvent,
    UserSourceSubscription
} from './types';

const getAuthToken = () => localStorage.getItem('accessToken');

const apiFetch = async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers as Record<string, string>,
    };

    const token = getAuthToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // 修复：确保所有相对路径的API调用都使用当前页面的协议和主机，
    // 这可以从根本上解决 "Mixed Content" 错误。
    const finalUrl = new URL(url, window.location.origin).href;

    const response = await fetch(finalUrl, { ...options, headers });

    // Centralized handling for authentication errors (401 Unauthorized, 403 Forbidden)
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('accessToken');
        window.location.reload();
        // Throw an error to stop the current execution flow.
        // The page reload will handle redirecting to the login page.
        throw new Error('会话已过期或权限不足，请重新登录。');
    }

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = { detail: `HTTP error! status: ${response.status}`, message: `HTTP error! status: ${response.status}` };
        }
        console.error("API Error:", errorData);
        const errorMessage = errorData.detail || errorData.message || `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
};

// --- Auth Service ---

export const login = async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const response = await apiFetch(`${USER_SERVICE_PATH}/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
    // FIX: The user object from the login response already matches the `User` type with `user_id`.
    // The previous implementation was incorrectly trying to map a non-existent `id` field.
    return { 
        token: response.accessToken, 
        user: response.user
    };
};

export const register = async (username: string, email: string, password: string): Promise<User> => {
    return apiFetch(`${USER_SERVICE_PATH}/register`, {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
    });
};

export const getMe = async (): Promise<User> => {
    const user = await apiFetch(`${USER_SERVICE_PATH}/me`);
    return { ...user, user_id: user.id };
};


// --- User Management (Admin) ---
interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const getUsers = async (params: { page: number; limit: number; search_term?: string; plan_name?: string; status?: string }): Promise<PaginatedResponse<AdminUser>> => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch(`${USER_SERVICE_PATH}?${query}`);
};

export const registerUser = async (username: string, email: string, password: string, plan_name: string): Promise<AdminUser> => {
    return apiFetch(`${USER_SERVICE_PATH}/register`, {
        method: 'POST',
        body: JSON.stringify({ username, email, password, plan_name }),
    });
};

export const updateUser = async (userId: string, data: Partial<AdminUser>): Promise<AdminUser> => {
    return apiFetch(`${USER_SERVICE_PATH}/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

export const deleteUser = async (userId: string): Promise<void> => {
    return apiFetch(`${USER_SERVICE_PATH}/${userId}`, {
        method: 'DELETE',
    });
};


// --- Plans ---
export const getPlans = async (): Promise<PlanDetails> => {
    return apiFetch(`${USER_SERVICE_PATH}/plans`);
};

// --- POIs (Focus Points) ---
export const getUserPois = async (): Promise<ApiPoi[]> => {
    return apiFetch(`${USER_SERVICE_PATH}/me/pois`);
};

export const addUserPoi = async (data: { content: string; keywords: string }): Promise<ApiPoi> => {
    return apiFetch(`${USER_SERVICE_PATH}/me/pois`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const deleteUserPoi = async (poiId: string): Promise<void> => {
    return apiFetch(`${USER_SERVICE_PATH}/me/pois/${poiId}`, {
        method: 'DELETE',
    });
};

// --- User Source Subscriptions ---
export const getUserSubscribedSources = async (): Promise<UserSourceSubscription[]> => {
    return apiFetch(`${USER_SERVICE_PATH}/me/sources`);
};

export const addUserSourceSubscription = async (sourceId: string): Promise<void> => {
    // FIX: Changed endpoint to include sourceId in the path and removed body, as per API docs.
    return apiFetch(`${USER_SERVICE_PATH}/me/sources/${sourceId}`, {
        method: 'POST',
    });
};

export const deleteUserSourceSubscription = async (sourceId: string): Promise<void> => {
    return apiFetch(`${USER_SERVICE_PATH}/me/sources/${sourceId}`, {
        method: 'DELETE',
    });
};

// --- Intelligence Service ---

export const getSources = async (): Promise<SystemSource[]> => {
    const sources = await apiFetch(`${INTELLIGENCE_SERVICE_PATH}/sources`);
    // Per API doc, response items have: id, source_name, points_count
    // SystemSource type requires: id, name, points_count
    return sources.map((s: any) => ({
        id: s.id, // Use id from API
        name: s.source_name, // Map source_name to name
        points_count: s.points_count, // Use points_count from API
        // UI-synthesized fields
        description: '',
        iconUrl: '',
        category: '',
        infoCount: 0,
        subscriberCount: 0,
    }));
};

export const getSubscriptions = async (): Promise<Subscription[]> => {
    try {
        // This is a workaround because the API doesn't provide a single endpoint
        // to get all intelligence points for a user.
        // 1. Get the list of source names the user is subscribed to.
        const userSources = await getUserSubscribedSources();
        if (!userSources || userSources.length === 0) {
            return [];
        }
        
        // 2. For each source, fetch its associated intelligence points in parallel.
        const pointPromises = userSources.map(source => 
            getPointsBySourceName(source.source_name).catch(err => {
                console.error(`Failed to fetch points for source: ${source.source_name}`, err);
                return []; // Return empty array on failure to not break the entire process
            })
        );
        
        const results = await Promise.all(pointPromises);
        
        // 3. Flatten the array of arrays into a single list of subscriptions.
        return results.flat();
    } catch (error) {
        console.error("Could not fetch subscriptions due to an error fetching user's sources:", error);
        return [];
    }
};

export const getPointsBySourceName = async (sourceName: string): Promise<Subscription[]> => {
    const query = new URLSearchParams({ source_name: sourceName.trim() }).toString();
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/points?${query}`);
};

export const addPoint = async (data: Partial<Subscription>): Promise<Subscription> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/points`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const updatePoint = async (id: string, data: Partial<Subscription>): Promise<Subscription> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/points/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

export const deletePoints = async (ids: string[]): Promise<void> => {
    // FIX: Changed the request body key from 'ids' to 'point_ids' to match API docs.
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/points`, {
        method: 'DELETE',
        body: JSON.stringify({ point_ids: ids }),
    });
};

// --- Articles / InfoItems ---

export const getArticles = async (point_ids: string[], params: { page: number, limit: number, publish_date_start?: string, publish_date_end?: string }): Promise<PaginatedResponse<InfoItem>> => {
    
    const hasPointFilter = point_ids && point_ids.length > 0;
    const hasDateFilter = params.publish_date_start || params.publish_date_end;

    // SCENARIO 1: Generic browsing with no filters. Use the simpler GET endpoint.
    if (!hasPointFilter && !hasDateFilter) {
        const query = new URLSearchParams({
            page: String(params.page),
            limit: String(params.limit),
        }).toString();
        return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/articles?${query}`);
    }

    // SCENARIO 2: Any kind of filtering is applied. Use the more robust POST endpoint.
    const body: { [key: string]: any } = {
        query_text: '*', // Use wildcard for non-semantic filtering
        point_ids: hasPointFilter ? point_ids : undefined,
        page: params.page,
        limit: params.limit,
    };

    if (params.publish_date_start) {
        body.publish_date_start = params.publish_date_start;
    }
    if (params.publish_date_end) {
        body.publish_date_end = params.publish_date_end;
    }

    const url = `${INTELLIGENCE_SERVICE_PATH}/search/articles_filtered`;
    
    return apiFetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
    });
};


export const searchArticles = async (query_text: string, point_ids: string[], limit: number): Promise<SearchResult[]> => {
    // 最终修复：此函数也应该使用支持POST的正确端点。
    // 注意：简单搜索可以调用 `/search/articles`，但为了统一和稳健，我们统一使用更强大的 `articles_filtered`
    const results = await apiFetch(`${INTELLIGENCE_SERVICE_PATH}/search/articles_filtered`, {
        method: 'POST',
        body: JSON.stringify({ query_text, point_ids, limit, page: 1 }),
    });
    return results.items;
};

export const searchArticlesFiltered = async (params: any): Promise<PaginatedResponse<SearchResult>> => {
    // 最终修复：确保此函数也调用正确的端点
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/search/articles_filtered`, {
        method: 'POST',
        body: JSON.stringify(params),
    });
}

// Helper for App.tsx
export const getInitialArticles = async (): Promise<InfoItem[]> => {
    const subscriptions = await getSubscriptions();
    if (subscriptions.length === 0) return [];
    const pointIds = subscriptions.map(sub => sub.id);
    const data = await getArticles(pointIds, { page: 1, limit: 100 });
    return data.items;
};

export const processUrlToInfoItem = async (url: string, setFeedback: (msg: string) => void): Promise<InfoItem> => {
    setFeedback("正在提交URL...");
    // This is a complex operation; we'll mock the stages
    return new Promise((resolve, reject) => {
        setTimeout(() => setFeedback("AI正在读取页面内容..."), 1000);
        setTimeout(() => setFeedback("AI正在分析和总结..."), 3000);
        setTimeout(() => {
            const mockItem: InfoItem = {
                id: `temp-${Date.now()}`,
                point_id: 'custom',
                source_name: new URL(url).hostname.replace('www.', ''),
                point_name: '自定义添加',
                title: 'AI生成的标题：新一代汽车芯片发布',
                original_url: url,
                publish_date: new Date().toISOString(),
                content: '这是由AI根据您提供的URL生成的摘要内容。它将包含页面的关键信息、要点和结论，为您提供快速的情报概览。',
                created_at: new Date().toISOString(),
            };
            resolve(mockItem);
        }, 5000);
    });
};

// --- Tasks ---

export const getProcessingTasks = async (params: { page: number; limit: number; status?: string; source_name?: string; point_name?: string; }): Promise<PaginatedResponse<ApiProcessingTask>> => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/tasks?${query}`);
};

export const getProcessingTasksStats = async (): Promise<{ [key: string]: number }> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/tasks/stats`);
};

// --- Events (Live/Offline Tasks) ---

export const getEvents = async (page: number, limit: number = 20): Promise<{events: AppEvent[], totalPages: number}> => {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) }).toString();
    const data: PaginatedResponse<ApiTask> = await apiFetch(`${INTELLIGENCE_SERVICE_PATH}/events/tasks?${query}`);
    return {
        events: data.items.map(convertApiTaskToFrontendEvent),
        totalPages: data.totalPages > 0 ? data.totalPages : 1,
    };
};

export const convertApiTaskToFrontendEvent = (task: ApiTask): AppEvent => {
  return {
    id: task.task_id,
    title: task.title,
    status: task.task_status,
    taskType: task.task_type,
    startTime: task.planned_start_time,
    organizer: {
      name: task.organizer_name || '未知',
      platform: task.organizer_platform || '未知',
    },
    coverImageUrl: task.cover_image_url,
    // Use replay URL if available, as it's often the persistent link after a live event.
    liveUrl: task.replay_url || task.live_url,
    sourceUri: task.source_uri,
    reportContentHtml: task.report_html,
  };
};

const createEventTask = async (endpoint: string, formData: FormData): Promise<ApiTask> => {
    // We can't use apiFetch for multipart/form-data
    const token = getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Task creation failed');
    }
    return response.json();
};

export const createLiveTask = async (liveUrl: string, plannedStartTime: string, coverImage?: File): Promise<ApiTask> => {
    const formData = new FormData();
    formData.append('live_url', liveUrl);
    formData.append('planned_start_time', plannedStartTime);
    if (coverImage) {
        formData.append('cover_image', coverImage);
    }
    return createEventTask(`${INTELLIGENCE_SERVICE_PATH}/events/tasks/live`, formData);
};

export const createOfflineTask = async (title: string, sourceUri: string, replayUrl: string, originalStartTime: string, coverImage?: File): Promise<ApiTask> => {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('source_uri', sourceUri);
    formData.append('replay_url', replayUrl);
    formData.append('original_start_time', originalStartTime);
    if (coverImage) {
        formData.append('cover_image', coverImage);
    }
    return createEventTask(`${INTELLIGENCE_SERVICE_PATH}/events/tasks/offline`, formData);
};

// --- Prompts ---

export const getPrompts = async (): Promise<AllPrompts> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/prompts`);
};

export const createPrompt = async (type: string, key: string, data: Prompt): Promise<Prompt> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/prompts`, {
        method: 'POST',
        body: JSON.stringify({ type, key, ...data }),
    });
};

export const updatePrompt = async (type: string, key: string, data: Prompt): Promise<Prompt> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/prompts/${type}/${key}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

export const deletePrompt = async (type: string, key: string): Promise<void> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/prompts/${type}/${key}`, {
        method: 'DELETE',
    });
};
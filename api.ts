// src/api.ts

import {
  User,
  Subscription,
  InfoItem,
  AdminUser,
  SystemSource,
  UserSourceSubscription,
  ApiPoi,
  PlanDetails,
  ApiProcessingTask,
  AllPrompts,
  LivestreamTask,
  SearchResult,
  Prompt,
} from './types';

import { USER_SERVICE_PATH, INTELLIGENCE_SERVICE_PATH } from './config';

// A generic fetch wrapper to handle auth, headers, and errors
const apiFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('accessToken');
  const headers = new Headers(options.headers || {});
  if (options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    // Unauthorized, likely expired token. Clear token and reload to trigger login.
    localStorage.removeItem('accessToken');
    window.location.reload();
    // Throw an error to stop further processing in the current call chain
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    // Try to parse the error message from the response body
    const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  // Handle cases where the response might be empty (e.g., 204 No Content)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return null; // For 204 No Content or other non-json responses
};

// --- Auth & User Service ---

export const login = async (email_or_username: string, password_hash: string): Promise<{ token: string; user: User }> => {
  return apiFetch(`${USER_SERVICE_PATH}/login`, {
    method: 'POST',
    body: JSON.stringify({ email_or_username, password_hash }),
  });
};

export const register = async (username: string, email: string, password_hash: string): Promise<User> => {
    return apiFetch(`${USER_SERVICE_PATH}/register`, {
        method: 'POST',
        body: JSON.stringify({ username, email, password_hash }),
    });
};

export const getMe = async (): Promise<User> => {
    return apiFetch(`${USER_SERVICE_PATH}/me`);
};

export const getUsers = async (params: { page: number; limit: number; search_term?: string; plan_name?: string; status?: string; }): Promise<{ items: AdminUser[]; total: number; totalPages: number; }> => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch(`${USER_SERVICE_PATH}?${query}`);
};

export const registerUser = async (username: string, email: string, password_hash: string, plan_name: string): Promise<AdminUser> => {
    return apiFetch(`${USER_SERVICE_PATH}`, {
        method: 'POST',
        body: JSON.stringify({ username, email, password_hash, plan_name }),
    });
};

export const updateUser = async (userId: string, data: Partial<{ username: string; email: string; plan_name: string; status: 'active' | 'disabled' }>): Promise<AdminUser> => {
    return apiFetch(`${USER_SERVICE_PATH}/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

export const deleteUser = async (userId: string): Promise<null> => {
    return apiFetch(`${USER_SERVICE_PATH}/${userId}`, { method: 'DELETE' });
};

// --- Plans ---
export const getPlans = async (): Promise<PlanDetails> => {
    return apiFetch(`${USER_SERVICE_PATH}/plans`);
};

// --- POIs (Points of Interest) ---
export const getUserPois = async (): Promise<ApiPoi[]> => {
    return apiFetch(`${USER_SERVICE_PATH}/me/pois`);
};

export const addUserPoi = async (poi: { content: string; keywords: string }): Promise<ApiPoi> => {
    return apiFetch(`${USER_SERVICE_PATH}/me/pois`, {
        method: 'POST',
        body: JSON.stringify(poi),
    });
};

export const deleteUserPoi = async (poiId: string): Promise<null> => {
    return apiFetch(`${USER_SERVICE_PATH}/me/pois/${poiId}`, { method: 'DELETE' });
};

// --- Source Subscriptions for a User ---
export const getUserSubscribedSources = async (): Promise<UserSourceSubscription[]> => {
    return apiFetch(`${USER_SERVICE_PATH}/me/sources`);
};

export const addUserSourceSubscription = async (sourceId: string): Promise<UserSourceSubscription> => {
    return apiFetch(`${USER_SERVICE_PATH}/me/sources`, {
        method: 'POST',
        body: JSON.stringify({ source_id: sourceId }),
    });
};

export const deleteUserSourceSubscription = async (sourceId: string): Promise<null> => {
    return apiFetch(`${USER_SERVICE_PATH}/me/sources/${sourceId}`, { method: 'DELETE' });
};


// --- Intelligence Service ---

// --- Intelligence Points (Subscriptions) ---
export const getSubscriptions = async (): Promise<Subscription[]> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/points`);
};

export const addPoint = async (pointData: Partial<Subscription>): Promise<Subscription> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/points`, {
        method: 'POST',
        body: JSON.stringify(pointData),
    });
};

export const updatePoint = async (pointId: string, pointData: Partial<Subscription>): Promise<Subscription> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/points/${pointId}`, {
        method: 'PUT',
        body: JSON.stringify(pointData),
    });
};

export const deletePoints = async (pointIds: string[]): Promise<null> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/points`, {
        method: 'DELETE',
        body: JSON.stringify({ point_ids: pointIds }),
    });
};

export const getPointsBySourceName = async (sourceName: string): Promise<Subscription[]> => {
    const query = new URLSearchParams({ source_name: sourceName }).toString();
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/points?${query}`);
};

// --- Sources ---
export const getSources = async (): Promise<SystemSource[]> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/sources`);
};

// --- Articles ---
export const searchArticlesFiltered = async (params: {
    query_text?: string;
    point_ids?: string[] | string;
    page?: number;
    limit?: number;
    publish_date_start?: string;
    publish_date_end?: string;
    similarity_threshold?: number;
}): Promise<{ items: SearchResult[]; total: number; totalPages: number; }> => {
    // Create a copy to avoid modifying the original object
    const queryParams: { [key: string]: any } = { ...params };

    // Handle array to comma-separated string for point_ids
    if (queryParams.point_ids && Array.isArray(queryParams.point_ids)) {
        queryParams.point_ids = queryParams.point_ids.join(',');
    }
    
    // Filter out undefined or null values before creating URLSearchParams
    Object.keys(queryParams).forEach(key => (queryParams[key] === undefined || queryParams[key] === null || queryParams[key] === '') && delete queryParams[key]);

    const queryString = new URLSearchParams(queryParams).toString();
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/articles/search?${queryString}`);
};

export const searchArticles = async (query: string, pointIds: string[], limit: number): Promise<SearchResult[]> => {
    const result = await searchArticlesFiltered({
        query_text: query,
        point_ids: pointIds,
        limit,
        page: 1,
    });
    return result.items;
};

// --- Processing Tasks ---
export const getProcessingTasks = async (params: { page: number, limit: number, status?: string, source_name?: string, point_name?: string }): Promise<{ items: ApiProcessingTask[]; total: number; totalPages: number; }> => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/tasks?${query}`);
};

export const getProcessingTasksStats = async (): Promise<{ [key: string]: number }> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/tasks/stats`);
};

// --- Process URL to InfoItem ---
export const processUrlToInfoItem = async (url: string, setFeedback: (msg: string) => void): Promise<InfoItem> => {
    setFeedback("正在连接服务器...");
    // The endpoint isn't defined in the backend spec, let's create a plausible one
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/process-url`, {
        method: 'POST',
        body: JSON.stringify({ url }),
    }).then(res => {
        setFeedback("处理完成！");
        return res;
    });
};

// --- Prompts ---
export const getPrompts = async (): Promise<AllPrompts> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/prompts`);
};

export const createPrompt = async (promptType: string, key: string, data: Prompt): Promise<Prompt> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/prompts/${promptType}/${key}`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const updatePrompt = async (promptType: string, key: string, data: Prompt): Promise<Prompt> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/prompts/${promptType}/${key}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

export const deletePrompt = async (promptType: string, key: string): Promise<null> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/prompts/${promptType}/${key}`, {
        method: 'DELETE',
    });
};

// --- Livestream/Video Analysis Tasks (Conference Manager / Industry Events) ---

// Assuming livestream service is under /intelligence/livestream
const LIVESTREAM_SERVICE_PATH = `${INTELLIGENCE_SERVICE_PATH}/livestream`;

export const getLivestreamTasks = async (): Promise<LivestreamTask[]> => {
    return apiFetch(`${LIVESTREAM_SERVICE_PATH}/tasks`);
};

export const createLiveAnalysisTask = async (data: { url: string; event_name: string; event_date: string }): Promise<{ task_id: string }> => {
    return apiFetch(`${LIVESTREAM_SERVICE_PATH}/tasks/live`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const createVideoAnalysisTask = async (data: { video_path: string; event_name: string; event_date: string }): Promise<{ task_id: string }> => {
    return apiFetch(`${LIVESTREAM_SERVICE_PATH}/tasks/video`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

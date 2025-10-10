// src/api.ts

import { USER_SERVICE_PATH, INTELLIGENCE_SERVICE_PATH } from './config';
import {
  User,
  InfoItem,
  Subscription,
  SystemSource,
  ApiTask,
  Event,
  ApiProcessingTask,
  SearchResult,
  PlanDetails,
  ApiPoi,
  UserSourceSubscription,
  AdminUser,
  AllPrompts,
  Prompt,
} from './types';

// --- Helper Functions ---

const TOKEN_KEY = 'accessToken';

/**
 * A generic fetch wrapper for API calls.
 * It handles JSON parsing, error handling, and automatically attaches the auth token.
 * @param path The full API path (e.g., '/users/login' or '/intelligence/points')
 * @param options Fetch API options (method, body, headers, etc.)
 * @returns Parsed JSON response
 * @throws Throws an error if the response status is not ok
 */
async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(path, { ...options, headers });

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.detail || errorBody.message || errorBody.error || errorMessage;
    } catch (e) {
      // If the response body isn't JSON or is empty, ignore
    }
     if (response.status === 401) {
        // Automatically handle token expiration
        localStorage.removeItem(TOKEN_KEY);
    }
    throw new Error(errorMessage);
  }

  // Return null for 204 No Content responses
  if (response.status === 204) {
    return null;
  }

  return response.json();
}


// --- Auth API (User Service) ---

export const loginUser = async (email: string, password: string): Promise<User> => {
  const response = await apiFetch(`${USER_SERVICE_PATH}/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  
  const user: User = {
    user_id: response.user.user_id,
    username: response.user.username,
    email: response.user.email,
  };

  if (response.accessToken) {
    localStorage.setItem(TOKEN_KEY, response.accessToken);
  }

  return user;
};

export const getMe = async (): Promise<User> => {
  const response = await apiFetch(`${USER_SERVICE_PATH}/me`);
  // API may return 'id', we map it to 'user_id' for consistency within the app.
  const user: User = {
    user_id: response.id || response.user_id,
    username: response.username,
    email: response.email,
  };
  return user;
};


export const registerUser = async (username: string, email: string, password: string, plan_name?: string): Promise<User> => {
  const body: { [key: string]: string } = { username, email, password };
    if (plan_name) {
        body.plan_name = plan_name;
    }
  const response = await apiFetch(`${USER_SERVICE_PATH}/register`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  // API returns 'id', we map it to 'user_id' for consistency within the app.
  const user: User = {
    user_id: response.id,
    username: response.username,
    email: response.email,
  };
  return user;
};

export const forgotPassword = async (email: string): Promise<void> => {
    console.log(`模拟发送密码重置邮件至: ${email}`);
    await new Promise(res => setTimeout(res, 1000));
    return;
};

// --- User Service API (Authenticated) ---

export const getUsers = (params: { page: number; limit: number; plan_name?: string; status?: string; search_term?: string }): Promise<{ items: AdminUser[], total: number, page: number, limit: number, totalPages: number }> => {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  if (params.plan_name) query.append('plan_name', params.plan_name);
  if (params.status) query.append('status', params.status);
  if (params.search_term) query.append('search_term', params.search_term);
  return apiFetch(`${USER_SERVICE_PATH}/?${query.toString()}`);
};

export const updateUser = (userId: string, data: { username?: string; email?: string; plan_name?: string; status?: string }): Promise<AdminUser> => {
  return apiFetch(`${USER_SERVICE_PATH}/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteUser = (userId: string): Promise<void> => {
  return apiFetch(`${USER_SERVICE_PATH}/${userId}`, {
    method: 'DELETE',
  });
};

export const getPlans = async (): Promise<PlanDetails> => {
  return apiFetch(`${USER_SERVICE_PATH}/plans`);
};


export const getUserPois = (): Promise<ApiPoi[]> => {
  return apiFetch(`${USER_SERVICE_PATH}/me/pois`);
};

export const addUserPoi = (data: { content: string; keywords: string }): Promise<ApiPoi> => {
  return apiFetch(`${USER_SERVICE_PATH}/me/pois`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const deleteUserPoi = (poiId: string): Promise<{ message: string }> => {
  return apiFetch(`${USER_SERVICE_PATH}/me/pois/${poiId}`, {
    method: 'DELETE',
  });
};

export const getUserSubscribedSources = (): Promise<UserSourceSubscription[]> => {
  return apiFetch(`${USER_SERVICE_PATH}/me/sources`);
};

export const addUserSourceSubscription = (sourceId: string): Promise<{ message: string }> => {
  return apiFetch(`${USER_SERVICE_PATH}/me/sources/${sourceId}`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
};

export const deleteUserSourceSubscription = (sourceId: string): Promise<{ message: string }> => {
  return apiFetch(`${USER_SERVICE_PATH}/me/sources/${sourceId}`, {
    method: 'DELETE',
  });
};


// --- Intelligence Service API ---

export const getPointsBySourceName = async (sourceName: string): Promise<Subscription[]> => {
    const encodedSourceName = encodeURIComponent(sourceName);
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/points?source_name=${encodedSourceName}`);
};

export const getAllIntelligencePoints = async (): Promise<Subscription[]> => {
  const sources = await getSources();
  if (sources.length === 0) return [];
  const pointPromises = sources.map(source => getPointsBySourceName(source.name));
  const pointsBySource = await Promise.all(pointPromises);
  return pointsBySource.flat();
};

export const getPoints = async (): Promise<Subscription[]> => {
    const userSources = await getUserSubscribedSources();
    if (userSources.length === 0) {
        return [];
    }
    const pointPromises = userSources.map(source => getPointsBySourceName(source.source_name));
    const pointsBySource = await Promise.all(pointPromises);
    return pointsBySource.flat();
};

export const getArticles = (
  pointIds: string[], 
  params: { 
    page: number; 
    limit: number;
    publish_date_start?: string;
    publish_date_end?: string;
  }
): Promise<{ items: InfoItem[], total: number, page: number, limit: number, totalPages: number }> => {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  
  if (params.publish_date_start) {
    query.append('publish_date_start', params.publish_date_start);
  }
  if (params.publish_date_end) {
    query.append('publish_date_end', params.publish_date_end);
  }

  if (pointIds.length > 0) {
    pointIds.forEach(id => query.append('point_ids', id));
  }
  
  const queryString = query.toString();
  
  return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/articles?${queryString}`);
};

export const getSources = async (): Promise<SystemSource[]> => {
  const sourcesFromApi = await apiFetch(`${INTELLIGENCE_SERVICE_PATH}/sources`);
  return sourcesFromApi.map((s: any) => ({
      id: s.id,
      name: s.source_name,
      points_count: s.points_count,
      description: `Contains ${s.points_count} intelligence points.`,
      iconUrl: '',
      category: 'General',
      infoCount: 0, 
      subscriberCount: 0,
  }));
};

export const getEvents = async (page: number, limit: number = 12): Promise<{ events: Event[], totalPages: number }> => {
    console.warn("getEvents is using a mocked response as the endpoint appears to be missing.");
    return Promise.resolve({ events: [], totalPages: 1 });
};

export const getProcessingTasks = (params: { page: number; limit: number; status?: string; source_name?: string; point_name?: string }): Promise<{ tasks: ApiProcessingTask[], totalPages: number, total: number }> => {
    const query = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
    });
    if (params.status) query.append('status', params.status);
    if (params.source_name) query.append('source_name', params.source_name);
    if (params.point_name) query.append('point_name', params.point_name);

    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/tasks?${query.toString()}`).then(response => ({
        tasks: response.items,
        totalPages: response.total > 0 ? Math.ceil(response.total / params.limit) : 1,
        total: response.total,
    }));
};

export const getProcessingTasksStats = async (): Promise<{ [key: string]: number }> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/tasks/stats`);
};

export const addPoint = (data: Partial<Subscription>): Promise<{message: string, point_id: string}> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/points`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const updatePoint = (pointId: string, data: Partial<Subscription>): Promise<{message: string}> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/points/${pointId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

export const deletePoints = (pointIds: string[]): Promise<{ message: string }> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/points`, {
        method: 'DELETE',
        body: JSON.stringify({ point_ids: pointIds }),
    });
};

export const retryProcessingTask = (taskId: string): Promise<ApiProcessingTask> => {
    console.log(`Retrying task ${taskId}`);
    return Promise.resolve({} as ApiProcessingTask);
};


export const searchArticles = async (query: string, point_ids: string[], limit: number): Promise<SearchResult[]> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/search/articles?top_k=${limit}`, {
        method: 'POST',
        body: JSON.stringify({ query_text: query, point_ids }),
    });
};

export const searchArticlesFiltered = (params: {
    query_text: string;
    similarity_threshold?: number;
    point_ids?: string[];
    source_names?: string[];
    publish_date_start?: string;
    publish_date_end?: string;
    page?: number;
    limit?: number;
}): Promise<{ items: SearchResult[], total: number, page: number, limit: number, totalPages: number }> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/search/articles_filtered`, {
        method: 'POST',
        body: JSON.stringify(params),
    }).then(response => ({
        ...response,
        totalPages: response.total > 0 && params.limit ? Math.ceil(response.total / params.limit) : 1,
    }));
};


export const processUrlToInfoItem = async (url: string, setFeedback: (msg: string) => void): Promise<InfoItem> => {
  setFeedback('正在连接到目标URL...');
  await new Promise(res => setTimeout(res, 1500));
  setFeedback('正在提取主要内容...');
  await new Promise(res => setTimeout(res, 2000));
  setFeedback('AI正在分析和生成摘要...');
  await new Promise(res => setTimeout(res, 3000));
  
  const mockResult: InfoItem = {
    id: `custom-${Date.now()}`,
    point_id: 'custom-source',
    source_name: new URL(url).hostname,
    point_name: '自定义来源',
    title: `从URL提取的标题：${url}`,
    original_url: url,
    publish_date: new Date().toISOString(),
    content: `这是从URL提取并由AI生成的结构化内容摘要。\n\n分析表明，该页面的核心观点是关于...`,
    created_at: new Date().toISOString(),
  };
  return mockResult;
};

// --- Prompt Management API ---

export const getPrompts = (): Promise<AllPrompts> => {
  return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/prompts`);
};

export const createPrompt = (promptType: 'url_extraction_prompts' | 'content_summary_prompts', promptKey: string, data: Prompt): Promise<{ message: string }> => {
  return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/prompts/${promptType}/${promptKey}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updatePrompt = (promptType: 'url_extraction_prompts' | 'content_summary_prompts', promptKey: string, data: Partial<Prompt>): Promise<{ message: string }> => {
  return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/prompts/${promptType}/${promptKey}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deletePrompt = (promptType: 'url_extraction_prompts' | 'content_summary_prompts', promptKey: string): Promise<{ message: string }> => {
  return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/prompts/${promptType}/${promptKey}`, {
    method: 'DELETE',
  });
};


const createEventTask = (endpoint: string, formData: FormData): Promise<ApiTask> => {
    console.warn(`createEventTask (${endpoint}) is using a mocked response.`);
    return Promise.resolve({} as ApiTask);
};

export const createLiveTask = (live_url: string, planned_start_time: string, cover_image?: File): Promise<ApiTask> => {
    const formData = new FormData();
    formData.append('live_url', live_url);
    formData.append('planned_start_time', planned_start_time);
    if (cover_image) formData.append('cover_image', cover_image);
    return createEventTask('/tasks/live', formData);
};

export const createOfflineTask = (title: string, source_uri: string, replay_url: string, original_start_time: string, cover_image?: File): Promise<ApiTask> => {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('source_uri', source_uri);
    formData.append('replay_url', replay_url);
    formData.append('original_start_time', original_start_time);
    if (cover_image) formData.append('cover_image', cover_image);
    return createEventTask('/tasks/offline', formData);
};

export const convertApiTaskToFrontendEvent = (task: ApiTask): Event => {
  return {
    id: task.task_id,
    title: task.title,
    status: task.task_status,
    taskType: task.task_type,
    startTime: task.planned_start_time,
    organizer: {
      name: task.organizer_name || '未知主办方',
      platform: task.organizer_platform || '未知平台',
    },
    coverImageUrl: task.cover_image_url,
    liveUrl: task.task_status === 'LIVE' ? task.live_url : task.replay_url,
    sourceUri: task.source_uri,
    reportContentHtml: task.report_html,
  };
};

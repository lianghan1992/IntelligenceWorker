// src/api.ts

import { API_BASE_URL, USER_API_BASE_URL } from './config';
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
  UserSubscribedSource,
} from './types';

// --- Helper Functions ---

/**
 * A generic fetch wrapper for the main API service (port 7656).
 * It handles API requests, JSON parsing, and error handling.
 * @param endpoint API endpoint (e.g., '/users')
 * @param options Fetch API options (method, body, headers, etc.)
 * @returns Parsed JSON response
 * @throws Throws an error if the response status is not ok
 */
async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.detail || errorBody.message || errorMessage;
    } catch (e) {
      // If the response body isn't JSON or is empty, ignore
    }
    throw new Error(errorMessage);
  }

  // Return null for 204 No Content responses
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

/**
 * A dedicated fetch wrapper for the User Service API (port 7657).
 */
async function userApiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${USER_API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.error || errorBody.detail || errorBody.message || errorMessage;
    } catch (e) {
      // Ignore if body is not JSON
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}


// --- Auth API (Uses User Service) ---

export const loginUser = async (username: string, password: string): Promise<User> => {
  const response = await userApiFetch('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  if (response.status === 'success' && response.data) {
    return response.data;
  }
  throw new Error(response.message || 'Login failed');
};

export const registerUser = async (username: string, email: string, password: string): Promise<User> => {
  const response = await userApiFetch('/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
  if (response.status === 'success' && response.data) {
    return response.data;
  }
  throw new Error(response.message || 'Registration failed');
};

export const forgotPassword = async (email: string): Promise<void> => {
    await userApiFetch('/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
};

// --- User Service API ---

export const getPlans = (): Promise<PlanDetails> => {
  return userApiFetch('/plans');
};

export const getUserPois = (userId: string): Promise<ApiPoi[]> => {
  return userApiFetch(`/users/${userId}/pois`);
};

export const addUserPoi = (userId: string, data: { content: string; keywords: string }): Promise<{ message: string; poi_id: string }> => {
  return userApiFetch(`/users/${userId}/pois`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const deleteUserPoi = (userId: string, poiId: string): Promise<{ message: string }> => {
  return userApiFetch(`/users/${userId}/pois/${poiId}`, {
    method: 'DELETE',
  });
};

export const getUserSubscribedSources = (userId: string): Promise<UserSubscribedSource[]> => {
  return userApiFetch(`/users/${userId}/sources`);
};

export const addUserSourceSubscription = (userId: string, sourceId: string): Promise<{ message: string }> => {
  return userApiFetch(`/users/${userId}/sources`, {
    method: 'POST',
    body: JSON.stringify({ source_id: sourceId }),
  });
};

export const deleteUserSourceSubscription = (userId: string, sourceId: string): Promise<{ message: string }> => {
  return userApiFetch(`/users/${userId}/sources/${sourceId}`, {
    method: 'DELETE',
  });
};


// --- Data Fetching API (Main Service) ---

export const getPoints = (): Promise<Subscription[]> => {
  return apiFetch('/points');
};

export const getArticles = (params: { page: number; limit: number }): Promise<{ items: InfoItem[], total: number, page: number, limit: number, totalPages: number }> => {
  const query = new URLSearchParams({ 
      page: params.page.toString(), 
      limit: params.limit.toString() 
  }).toString();
  return apiFetch(`/articles?${query}`);
};

export const getSources = (): Promise<SystemSource[]> => {
  return apiFetch('/sources');
};

export const getEvents = async (page: number, limit: number = 12): Promise<{ events: Event[], totalPages: number }> => {
    const data = await apiFetch(`/tasks/events?page=${page}&limit=${limit}`);
    return {
        events: data.tasks.map(convertApiTaskToFrontendEvent),
        totalPages: data.total_pages,
    };
};

export const getProcessingTasks = (page: number, limit: number): Promise<{ tasks: ApiProcessingTask[], totalPages: number }> => {
    return apiFetch(`/tasks/processing?page=${page}&limit=${limit}`);
};

// --- Data Manipulation API (Main Service) ---

export const addPoint = (data: Omit<Subscription, 'id' | 'keywords' | 'newItemsCount'>): Promise<Subscription> => {
    return apiFetch('/points', {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const updatePoint = (id: string, data: Partial<Subscription>): Promise<Subscription> => {
    return apiFetch(`/points/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

export const deletePoint = (id: string): Promise<void> => {
    return apiFetch(`/points/${id}`, {
        method: 'DELETE',
    });
};

export const retryProcessingTask = (taskId: string): Promise<ApiProcessingTask> => {
    return apiFetch(`/tasks/processing/${taskId}/retry`, {
        method: 'POST',
    });
};

// --- AI & Processing API (Main Service) ---

export const processUrlToInfoItem = async (url: string, setFeedback: (msg: string) => void): Promise<InfoItem> => {
  // This is a long-running operation, so we simulate some feedback
  setFeedback('正在连接到目标URL...');
  await new Promise(res => setTimeout(res, 1500));
  setFeedback('正在提取主要内容...');
  await new Promise(res => setTimeout(res, 2000));
  setFeedback('AI正在分析和生成摘要...');
  await new Promise(res => setTimeout(res, 3000));
  
  // Mock result from the API
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

export const searchArticles = async (query: string, point_ids: string[], limit: number): Promise<SearchResult[]> => {
    return apiFetch('/search/articles', {
        method: 'POST',
        body: JSON.stringify({ query, point_ids, limit }),
    });
};

export const extractKeywords = async (text: string): Promise<string[]> => {
    const response = await apiFetch('/ai/extract-keywords', {
        method: 'POST',
        body: JSON.stringify({ text }),
    });
    return response.keywords;
};

// --- Event Task API (Main Service) ---
const createEventTask = (endpoint: string, formData: FormData): Promise<ApiTask> => {
    // For FormData, we should not manually set the Content-Type header
    return fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
    }).then(async res => {
        if (!res.ok) {
            const errorBody = await res.json();
            throw new Error(errorBody.detail || '创建任务失败');
        }
        return res.json();
    });
};

export const createLiveTask = (live_url: string, planned_start_time: string, cover_image?: File): Promise<ApiTask> => {
    const formData = new FormData();
    formData.append('live_url', live_url);
    formData.append('planned_start_time', planned_start_time);
    if (cover_image) {
        formData.append('cover_image', cover_image);
    }
    return createEventTask('/tasks/live', formData);
};

export const createOfflineTask = (title: string, source_uri: string, replay_url: string, original_start_time: string, cover_image?: File): Promise<ApiTask> => {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('source_uri', source_uri);
    formData.append('replay_url', replay_url);
    formData.append('original_start_time', original_start_time);
    if (cover_image) {
        formData.append('cover_image', cover_image);
    }
    return createEventTask('/tasks/offline', formData);
};

// --- Data Conversion ---

/**
 * Converts the backend ApiTask object to a frontend Event object.
 * This is crucial for fixing type errors in IndustryEvents.tsx.
 * @param task The ApiTask object received from the API
 * @returns An Event object that can be displayed in the UI
 */
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
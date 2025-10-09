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
} from './types';

// --- Helper Functions ---

/**
 * A generic fetch wrapper for API calls.
 * It handles JSON parsing, error handling, and constructing the correct API path.
 * @param path The full API path (e.g., '/users/login' or '/intelligence/points')
 * @param options Fetch API options (method, body, headers, etc.)
 * @returns Parsed JSON response
 * @throws Throws an error if the response status is not ok
 */
async function apiFetch(path: string, options: RequestInit = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(path, { ...options, headers });

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.detail || errorBody.message || errorBody.error || errorMessage;
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


// --- Auth API (User Service) ---

export const loginUser = async (email: string, password: string): Promise<User> => {
  const response = await apiFetch(`${USER_SERVICE_PATH}/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  
  const user: User = {
    user_id: response.user_id,
    username: response.username,
    email: email,
  };
  return user;
};

export const registerUser = async (username: string, email: string, password: string): Promise<User> => {
  const response = await apiFetch(`${USER_SERVICE_PATH}/register`, {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
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

// --- User Service API ---

export const getPlans = async (): Promise<PlanDetails> => {
  const plans = await apiFetch(`${USER_SERVICE_PATH}/plans`);
  // Map price to price_monthly for compatibility with PricingModal
  for (const key in plans) {
      if (plans[key].price !== undefined) {
          (plans[key] as any).price_monthly = plans[key].price;
      }
  }
  return plans;
};


export const getUserPois = (userId: string): Promise<ApiPoi[]> => {
  // FIX: Path construction was duplicating 'users'.
  return apiFetch(`${USER_SERVICE_PATH}/${userId}/pois`);
};

export const addUserPoi = (userId: string, data: { content: string; keywords: string }): Promise<ApiPoi> => {
  // FIX: Path construction was duplicating 'users'.
  return apiFetch(`${USER_SERVICE_PATH}/${userId}/pois`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const deleteUserPoi = (userId: string, poiId: string): Promise<{ message: string }> => {
  // FIX: Path construction was duplicating 'users'.
  return apiFetch(`${USER_SERVICE_PATH}/${userId}/pois/${poiId}`, {
    method: 'DELETE',
  });
};

export const getUserSubscribedSources = (userId: string): Promise<UserSourceSubscription[]> => {
  // FIX: Path construction was duplicating 'users'.
  return apiFetch(`${USER_SERVICE_PATH}/${userId}/sources`);
};

export const addUserSourceSubscription = (userId: string, sourceId: string): Promise<{ message: string }> => {
  // FIX: Path construction was duplicating 'users'.
  return apiFetch(`${USER_SERVICE_PATH}/${userId}/sources/${sourceId}`, {
    method: 'POST'
  });
};

export const deleteUserSourceSubscription = (userId: string, sourceId: string): Promise<{ message: string }> => {
  // FIX: Path construction was duplicating 'users'.
  return apiFetch(`${USER_SERVICE_PATH}/${userId}/sources/${sourceId}`, {
    method: 'DELETE',
  });
};


// --- Intelligence Service API ---

// This function gets all intelligence points in the system, but fetches them by source.
// The Admin page uses this to display all available points for management.
export const getAllIntelligencePoints = async (): Promise<Subscription[]> => {
  const sources = await getSources();
  if (sources.length === 0) return [];
  const pointPromises = sources.map(source =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/points?source_name=${encodeURIComponent(source.name)}`)
  );
  const pointsBySource = await Promise.all(pointPromises);
  // Flatten the array of arrays into a single array of points
  return pointsBySource.flat();
};

// This function gets only the intelligence points that a user is subscribed to.
// This is the new logic for the main app views.
export const getPoints = async (userId: string): Promise<Subscription[]> => {
    // 1. Get the list of sources the user is subscribed to.
    const userSources = await getUserSubscribedSources(userId);
    if (userSources.length === 0) {
        return []; // If user has no subscriptions, return early.
    }

    // 2. For each subscribed source, create a promise to fetch its points.
    const pointPromises = userSources.map(source =>
        apiFetch(`${INTELLIGENCE_SERVICE_PATH}/points?source_name=${encodeURIComponent(source.source_name)}`)
    );

    // 3. Execute all fetch promises in parallel.
    const pointsBySource = await Promise.all(pointPromises);

    // 4. Flatten the array of arrays into a single array of points and return.
    return pointsBySource.flat();
};

export const getArticles = (pointIds: string[], params: { page: number; limit: number }): Promise<{ items: InfoItem[], total: number, page: number, limit: number, totalPages: number }> => {
  const pointIdsQuery = pointIds.map(id => `point_ids=${encodeURIComponent(id)}`).join('&');
  const query = `${pointIdsQuery}&page=${params.page}&limit=${params.limit}`;
  return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/articles?${query}`);
};

export const getSources = async (): Promise<SystemSource[]> => {
  const sourcesFromApi = await apiFetch(`${INTELLIGENCE_SERVICE_PATH}/sources`);
  // Map API response to the SystemSource type used by UI components
  return sourcesFromApi.map((s: any) => ({
      id: s.source_id,
      name: s.source_name,
      points_count: s.points_count,
      // Add default values for UI fields that no longer exist in API
      description: `Contains ${s.points_count} intelligence points.`,
      iconUrl: '', // Will fallback to letter icon
      category: 'General',
      infoCount: 0, 
      subscriberCount: 0,
  }));
};

// Note: Event APIs seem to be from a different, older service. Retaining for now.
export const getEvents = async (page: number, limit: number = 12): Promise<{ events: Event[], totalPages: number }> => {
    // This endpoint seems to be missing from the new unified API doc. Mocking a response to prevent crash.
    console.warn("getEvents is using a mocked response as the endpoint appears to be missing.");
    return Promise.resolve({ events: [], totalPages: 0 });
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

// Proposed new API to get task statistics efficiently.
export const getProcessingTasksStats = async (): Promise<{ [key: string]: number }> => {
    // In a real application, this would be a single API call to a dedicated endpoint like:
    // return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/tasks/stats`);
    // This mock data simulates what the backend would return.
    console.warn("getProcessingTasksStats is using mocked data as the backend endpoint is not yet available.");
    return Promise.resolve({
        completed: 1342,
        processing: 43,
        failed: 12,
        pending_jina: 56,
        total: 1453
    });
};

export const addPoint = (data: Omit<Subscription, 'id' | 'keywords' | 'newItemsCount' | 'is_active' | 'last_triggered_at' | 'created_at' | 'updated_at' | 'source_id'>): Promise<{message: string, point_id: string}> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/points`, {
        method: 'POST',
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
    // This API endpoint seems to be missing from the new doc, providing a mock.
    console.log(`Retrying task ${taskId}`);
    return Promise.resolve({} as ApiProcessingTask);
};


export const searchArticles = async (query: string, point_ids: string[], limit: number): Promise<SearchResult[]> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/search/articles?top_k=${limit}`, {
        method: 'POST',
        body: JSON.stringify({ query_text: query, point_ids }),
    });
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

// Event Task API calls seem to be from another service, keeping for now for compatibility.
const createEventTask = (endpoint: string, formData: FormData): Promise<ApiTask> => {
    // This endpoint seems to be missing from the new unified API doc. Mocking a response.
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
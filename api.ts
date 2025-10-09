// src/api.ts

import { API_BASE_URL } from './config';
import {
  User,
  InfoItem,
  Subscription,
  SystemSource,
  ApiTask,
  Event,
  ApiProcessingTask,
  SearchResult,
} from './types';

// --- Helper Functions ---

/**
 * 一个通用的 fetch 包装器，用于处理 API 请求、JSON 解析和错误处理。
 * @param endpoint API 端点 (例如, '/users')
 * @param options Fetch API 的选项 (方法, body, headers, 等)
 * @returns 解析后的 JSON 响应
 * @throws 如果响应状态不是 ok，则抛出错误
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
      // 如果响应体不是JSON或为空，则忽略
    }
    throw new Error(errorMessage);
  }

  // 如果响应状态为 204 No Content，则返回 null
  if (response.status === 204) {
    return null;
  }

  return response.json();
}


// --- Auth API ---

export const loginUser = async (username: string, password: string): Promise<User> => {
  // 在实际应用中，这将是一个 POST 请求
  console.log('Logging in with:', username, password);
  // 模拟一个成功的登录
  if (password === 'password') {
    return Promise.resolve({
      user_id: 'user-123',
      username: username,
      email: `${username.toLowerCase()}@example.com`,
    });
  }
  return Promise.reject(new Error('用户名或密码无效'));
};

export const registerUser = async (username: string, email: string, password: string): Promise<User> => {
  console.log('Registering:', username, email, password.substring(0,2) + '...');
  return Promise.resolve({
      user_id: `user-${Date.now()}`,
      username: username,
      email: email,
  });
};

export const forgotPassword = async (email: string): Promise<void> => {
    console.log('Password reset for:', email);
    if (email.includes('fail')) {
        return Promise.reject(new Error('无法找到该邮箱地址。'));
    }
    return Promise.resolve();
};


// --- Data Fetching API ---

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

// --- Data Manipulation API ---

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

// --- AI & Processing API ---

export const processUrlToInfoItem = async (url: string, setFeedback: (msg: string) => void): Promise<InfoItem> => {
  // 这是一个长时间运行的操作，所以我们模拟一些反馈
  setFeedback('正在连接到目标URL...');
  await new Promise(res => setTimeout(res, 1500));
  setFeedback('正在提取主要内容...');
  await new Promise(res => setTimeout(res, 2000));
  setFeedback('AI正在分析和生成摘要...');
  await new Promise(res => setTimeout(res, 3000));
  
  // 模拟从API返回的结果
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

// --- Event Task API ---
const createEventTask = (endpoint: string, formData: FormData): Promise<ApiTask> => {
    // 对于 FormData，我们不应手动设置 Content-Type header
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
 * 将后端的 ApiTask 对象转换为前端使用的 Event 对象。
 * 这是修复 IndustryEvents.tsx 中类型错误的关键。
 * @param task 从API接收的ApiTask对象
 * @returns 可以在UI中显示的Event对象
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

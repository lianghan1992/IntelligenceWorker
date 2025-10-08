import { API_BASE_URL } from './config';
import { User, Subscription, InfoItem, SystemSource, ApiProcessingTask, Event } from './types';

// --- 类型定义 ---

// 该接口定义了从后端 /tasks 端点接收的原始任务对象结构。
export interface ApiTask {
    id: string;
    title: string;
    status: 'UPCOMING' | 'LIVE' | 'SUMMARIZING' | 'CONCLUDED' | 'FAILED';
    task_type: 'LIVE' | 'OFFLINE';
    start_time: string;
    organizer_name: string;
    organizer_platform: string;
    cover_image_url: string | null;
    live_url: string | null;
    source_uri?: string | null;
    report_content_html: string | null;
}

// --- 辅助函数 ---

/**
 * 一个通用的 fetch 封装，用于处理请求、响应和错误。
 * @param endpoint API 端点路径 (e.g., '/users/login')
 * @param options Fetch API 的配置对象
 */
async function apiFetch(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    try {
        const response = await fetch(url, { ...options, headers });
        
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText || '发生未知错误'}`;
            try {
                // 优先尝试按JSON解析，并使用API文档中定义的 'detail' 字段
                const errorData = await response.json();
                if (errorData && errorData.detail) {
                    errorMessage = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
                } else if (errorData && errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (jsonError) {
                // 如果JSON解析失败，回退到按纯文本读取响应体
                try {
                    const textError = await response.text();
                    if (textError) {
                        errorMessage = textError;
                    }
                } catch (textError) {
                    // 如果读取文本也失败，则使用默认的HTTP状态信息
                }
            }
            throw new Error(errorMessage);
        }

        if (response.status === 204) { // No Content
            return null;
        }
        return response.json();
    } catch (error) {
        console.error(`API fetch error on ${endpoint}:`, error instanceof Error ? error.message : String(error));
        throw error;
    }
}


// --- 认证 API ---

export const loginUser = async (username: string, password: string): Promise<User> => {
    return apiFetch('/users/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
};

export const registerUser = async (username: string, email: string, password: string): Promise<User> => {
    return apiFetch('/users/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
    });
};

export const forgotPassword = async (email: string): Promise<void> => {
    await apiFetch('/users/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
};


// --- 数据获取 API ---

export const getPoints = async (): Promise<Subscription[]> => {
    // 根据 API v1.1.0, 获取情报点需要 `source_name`。
    // 为了获取所有情报点，我们必须先获取所有情报源，然后分别为每个情报源请求其下的情报点。
    const sources: SystemSource[] = await getSources();

    if (!sources || sources.length === 0) {
        return [];
    }

    // 为每个情报源创建一个fetch promise
    const allPointsPromises = sources.map(source => {
        const encodedSourceName = encodeURIComponent(source.name);
        return apiFetch(`/points?source_name=${encodedSourceName}`).catch(err => {
            console.error(`无法为情报源 "${source.name}" 获取情报点:`, err);
            return []; // 为失败的请求返回空数组，以避免 Promise.all 中断
        });
    });

    const pointsNestedArray = await Promise.all(allPointsPromises);
    
    // 将二维数组扁平化为一维数组
    return pointsNestedArray.flat();
};


export const getSources = async (): Promise<SystemSource[]> => {
    return apiFetch('/sources');
};

export const getArticles = async (params: { page: number; limit: number; point_ids?: string[]; source_name?: string }): Promise<{ items: InfoItem[]; total: number, page: number, limit: number, total_pages: number }> => {
    const query = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
    });
    if (params.point_ids) {
        params.point_ids.forEach(id => query.append('point_ids', id));
    }
    if (params.source_name) {
        query.append('source_name', params.source_name);
    }
    return apiFetch(`/articles?${query.toString()}`);
};

export const getProcessingTasks = async (params: {}): Promise<{ items: ApiProcessingTask[] }> => {
    // In a real app, you might have pagination or filtering params
    return apiFetch('/processing-tasks');
};

export const getEvents = async (page: number, limit: number = 12): Promise<{ events: Event[], totalPages: number }> => {
    const response = await apiFetch(`/tasks?page=${page}&limit=${limit}`);
    const events = response.items.map(convertApiTaskToFrontendEvent);
    return {
        events,
        totalPages: response.total_pages || 1,
    };
};

// --- 数据创建/修改 API ---

export const createPoint = async (sub: Omit<Subscription, 'id'| 'source_id' | 'is_active' | 'last_triggered_at' | 'created_at' | 'updated_at' | 'keywords' | 'newItemsCount'>): Promise<Subscription> => {
    return apiFetch('/points', {
        method: 'POST',
        body: JSON.stringify(sub),
    });
};

export const processUrlToInfoItem = async (url: string, setFeedback: (msg: string) => void): Promise<InfoItem> => {
    setFeedback("正在提交URL进行分析...");
    // This simulates a long-running process with feedback
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            setFeedback("AI正在读取和理解内容...");
            setTimeout(() => {
                setFeedback("生成结构化情报卡片...");
                setTimeout(() => {
                    if (url.includes("error")) {
                        reject(new Error("无法处理该URL，可能是不支持的格式或需要登录。"));
                    } else {
                        resolve({
                            id: `custom-${Date.now()}`,
                            point_id: 'custom-source',
                            source_name: '自定义来源',
                            point_name: '手动添加',
                            title: '从URL生成的情报标题',
                            original_url: url,
                            publish_date: new Date().toISOString(),
                            content: '这是AI从您提供的URL中提取并总结的内容。在实际应用中，这里会填充真实的、经过处理的信息摘要。',
                            created_at: new Date().toISOString(),
                        });
                    }
                }, 1500);
            }, 1500);
        }, 1000);
    });
};

export const createLiveTask = async (liveUrl: string, startTime: string, coverImage?: File): Promise<ApiTask> => {
    const formData = new FormData();
    formData.append('live_url', liveUrl);
    formData.append('start_time', startTime);
    if (coverImage) {
        formData.append('cover_image', coverImage);
    }
    const response = await fetch(`${API_BASE_URL}/tasks/live`, {
        method: 'POST',
        body: formData, // Don't set Content-Type header, browser does it for FormData
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '创建直播任务失败');
    }
    return response.json();
};

export const createOfflineTask = async (title: string, sourceUri: string, replayUrl: string, startTime: string, coverImage?: File): Promise<ApiTask> => {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('source_uri', sourceUri);
    formData.append('replay_url', replayUrl);
    formData.append('start_time', startTime);
    if (coverImage) {
        formData.append('cover_image', coverImage);
    }
    const response = await fetch(`${API_BASE_URL}/tasks/offline`, {
        method: 'POST',
        body: formData,
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '创建离线任务失败');
    }
    return response.json();
};

// --- 数据转换器 ---

/**
 * 将后端的 ApiTask 对象转换为前端使用的 Event 对象。
 */
export function convertApiTaskToFrontendEvent(task: ApiTask): Event {
    return {
        id: task.id,
        title: task.title,
        status: task.status,
        taskType: task.task_type,
        startTime: task.start_time,
        organizer: {
            name: task.organizer_name || '未知主办方',
            platform: task.organizer_platform || '未知平台',
        },
        coverImageUrl: task.cover_image_url,
        liveUrl: task.live_url,
        sourceUri: task.source_uri,
        reportContentHtml: task.report_content_html,
    };
}
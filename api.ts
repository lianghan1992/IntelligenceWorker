import { API_BASE_URL } from './config';
import { JINA_READER_URL } from './config';
import { InfoItem, InfoSource, Event, User, Subscription, SystemSource } from './types';

/**
 * NEW API FUNCTIONS for Intelligence Worker
 */

export async function getArticles(params: { 
    source_name?: string; 
    point_ids?: string[]; 
    page?: number; 
    limit?: number; 
}): Promise<{ items: InfoItem[], total: number, page: number, limit: number }> {
    const query = new URLSearchParams();
    if (params.source_name) query.set('source_name', params.source_name);
    if (params.point_ids) params.point_ids.forEach(id => query.append('point_ids', id));
    query.set('page', String(params.page || 1));
    query.set('limit', String(params.limit || 20));
    
    const response = await fetch(`${API_BASE_URL}/articles?${query}`);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch articles: ${errorText}`);
    }
    const data = await response.json();
    return { items: data.items, total: data.total, page: data.page, limit: data.limit };
}


// UPDATED to v1.1.0 API: The `GET /points` endpoint now works but requires a `source_name`.
// This function now fetches all sources, then fetches points for each source, and aggregates them.
export async function getPoints(): Promise<Subscription[]> {
    // 1. Fetch all sources
    const sourcesResponse = await fetch(`${API_BASE_URL}/sources`);
    if (!sourcesResponse.ok) {
        throw new Error('Failed to fetch sources, cannot retrieve points.');
    }
    const sources: { id: string; source_name: string }[] = await sourcesResponse.json();

    // 2. Fetch points for each source in parallel
    const pointsPromises = sources.map(source => {
        const query = new URLSearchParams({ source_name: source.source_name });
        return fetch(`${API_BASE_URL}/points?${query}`).then(res => {
            if (!res.ok) {
                console.error(`Failed to fetch points for source: ${source.source_name}. Status: ${res.status}`);
                return []; // Return an empty array for a failed source to avoid breaking the entire operation
            }
            return res.json();
        });
    });

    const results = await Promise.all(pointsPromises);
    const allPointsRaw = results.flat(); // Flatten the array of arrays

    // 3. Map the raw API response to the Subscription type for the frontend
    return allPointsRaw.map((p: any) => ({
        id: p.id,
        source_id: p.source_id,
        point_name: p.point_name,
        source_name: p.source_name,
        point_url: p.point_url,
        cron_schedule: p.cron_schedule,
        is_active: p.is_active,
        last_triggered_at: p.last_triggered_at,
        created_at: p.created_at,
        updated_at: p.updated_at,
        // Synthesize fields for UI compatibility
        keywords: [p.point_name, p.source_name].filter(Boolean),
        newItemsCount: 0, // Cannot determine this from API, defaulting to 0
    }));
}


// UPDATED to v1.1.0 API: This function now hits the real `GET /sources` endpoint
// and synthesizes extra data needed for the UI.
export async function getSources(): Promise<SystemSource[]> {
    const response = await fetch(`${API_BASE_URL}/sources`);
    if (!response.ok) throw new Error('Failed to fetch sources');
    const sourcesData: {id: string, source_name: string, subscription_count: number}[] = await response.json();

    return sourcesData.map((s: any) => ({
        id: s.id,
        name: s.source_name, // Map source_name to name for UI consistency
        subscription_count: s.subscription_count,
        // Synthesize extra data for UI compatibility
        description: `Official source for ${s.source_name} industry news.`,
        iconUrl: `https://logo.clearbit.com/${s.source_name.replace(/ /g, '').toLowerCase()}.com`, // Best guess for an icon
        category: '行业媒体',
        infoCount: Math.floor(Math.random() * 5000) + 1000, // Mocked for UI
        subscriberCount: Math.floor(Math.random() * 1000) + 200, // Mocked for UI
    }));
}

export async function createPoint(data: {
    source_name: string;
    point_name: string;
    point_url: string;
    cron_schedule: string;
}): Promise<{ message: string; point_id: string }> {
    const response = await fetch(`${API_BASE_URL}/points`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create point: ${errorText}`);
    }
    return response.json();
}


// FIX: Add missing API functions and types for Event/Task management
/**
 * Types and functions for Event/Task Management
 */

// This represents the raw task object received from the backend API.
export interface ApiTask {
  task_id: string;
  task_type: 'LIVE' | 'OFFLINE';
  task_status: 'UPCOMING' | 'LIVE' | 'SUMMARIZING' | 'CONCLUDED' | 'FAILED';
  live_url: string | null;
  replay_url: string | null;
  source_uri: string | null;
  planned_start_time: string; // ISO 8601
  created_at: string; // ISO 8601
  organizer_name: string | null;
  organizer_platform: string | null;
  title: string;
  cover_image_url: string | null;
  report_html: string | null;
  report_pdf_status: 'pending' | 'generating' | 'completed' | 'failed' | null;
  report_pdf_download_url: string | null;
}

// This function converts a raw API task object into the frontend-friendly Event type.
export function convertApiTaskToFrontendEvent(task: ApiTask): Event {
    return {
        id: task.task_id,
        title: task.title,
        status: task.task_status,
        taskType: task.task_type,
        pdfStatus: task.report_pdf_status,
        // Use planned_start_time for live events, but created_at for offline as a fallback
        startTime: task.planned_start_time || task.created_at,
        organizer: {
            name: task.organizer_name || '未知主办方',
            platform: task.organizer_platform || '未知平台',
        },
        coverImageUrl: task.cover_image_url,
        // The frontend uses liveUrl for both live and replay links
        liveUrl: task.replay_url || task.live_url,
        sourceUri: task.source_uri,
        reportContentHtml: task.report_html,
        pdfDownloadUrl: task.report_pdf_download_url,
    };
}


export async function getEvents(page = 1, limit = 10, status = ''): Promise<{ events: Event[], totalPages: number }> {
    const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    });

    if (status) {
        query.set('status', status);
    }
    
    const response = await fetch(`${API_BASE_URL}/tasks?${query}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch events: ${await response.text()}`);
    }
    const data = await response.json(); // API returns { items: ApiTask[], ..., pages: number }
    const events = data.items.map(convertApiTaskToFrontendEvent);
    return { events, totalPages: data.pages || 1 };
}

export async function createLiveTask(liveUrl: string, startTime: string, coverImage?: File): Promise<ApiTask> {
    const formData = new FormData();
    formData.append('live_url', liveUrl);
    formData.append('planned_start_time', startTime);
    if (coverImage) {
        formData.append('cover_image', coverImage);
    }

    const response = await fetch(`${API_BASE_URL}/tasks/live`, {
        method: 'POST',
        body: formData,
    });
    if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.detail || JSON.stringify(errorData);
        } catch (e) { /* Ignore JSON parsing error */ }
        throw new Error(`Failed to create live task: ${errorMsg}`);
    }
    return response.json();
}

export async function createOfflineTask(title: string, sourceUri: string, replayUrl: string, startTime: string, coverImage?: File): Promise<ApiTask> {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('source_uri', sourceUri);
    formData.append('replay_url', replayUrl);
    formData.append('planned_start_time', startTime);
    if (coverImage) {
        formData.append('cover_image', coverImage);
    }
    const response = await fetch(`${API_BASE_URL}/tasks/offline`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.detail || JSON.stringify(errorData);
        } catch (e) { /* Ignore JSON parsing error */ }
        throw new Error(`Failed to create offline task: ${errorMsg}`);
    }
    return response.json();
}

export async function stopTask(taskId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/stop`, {
        method: 'POST',
    });
    if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.detail || JSON.stringify(errorData);
        } catch (e) { /* Ignore JSON parsing error */ }
        throw new Error(`Failed to stop task: ${errorMsg}`);
    }
    return response.json();
}

export async function deleteEventTask(taskId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.detail || JSON.stringify(errorData);
        } catch (e) { /* Ignore JSON parsing error */ }
        throw new Error(`Failed to delete task: ${errorMsg}`);
    }
    return response.json();
}

/**
 * 使用 Jina AI Reader 读取给定 URL 的内容
 * @param url 要读取的URL
 * @returns 返回页面的Markdown内容
 */
async function readUrlContent(url: string): Promise<string> {
    try {
        const response = await fetch(`${JINA_READER_URL}${url}`, {
            headers: {
                'Accept': 'application/json',
            }
        });
        if (!response.ok) {
            throw new Error(`Jina API error: ${response.statusText}`);
        }
        const data = await response.json();
        return data.data.content;
    } catch (error) {
        console.error("使用Jina读取URL时出错:", error);
        throw error;
    }
}

// Fix: Added missing function `processUrlToInfoItem` to handle custom URL processing.
// This version is rewritten to not use any AI model for extraction.
export async function processUrlToInfoItem(url: string, setFeedback: (msg: string) => void): Promise<any> {
    try {
        setFeedback('正在读取 URL 内容...');
        const markdown = await readUrlContent(url);
        if (!markdown) {
            throw new Error("无法从 URL 读取内容。");
        }

        setFeedback('正在提取文章信息...');
        
        // Simple, non-AI extraction
        const titleMatch = markdown.match(/^(?:\s*#\s+)(.*)$/m);
        let title = new URL(url).hostname; // Default title
        if (titleMatch && titleMatch[1]) {
            title = titleMatch[1];
        } else {
             const titleTagMatch = markdown.match(/<title>(.*?)<\/title>/i);
             if (titleTagMatch && titleTagMatch[1]) {
                title = titleTagMatch[1];
             }
        }
        
        // Remove markdown for content
        const plainContent = markdown
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // remove links but keep text
            .replace(/(\*|_|`|#)/g, '') // remove markdown characters
            .replace(/\s+/g, ' ') // normalize whitespace
            .trim();

        const content = plainContent.length > 200 ? plainContent.substring(0, 200) + '...' : plainContent;

        const sourceName = new URL(url).hostname.replace(/^www\./, '');

        // Construct a partial InfoItem-like object for the UI
        return {
            id: `custom-${Date.now()}`,
            title: title.trim(),
            content: content,
            timestamp: new Date().toISOString(),
            source: {
                name: sourceName,
                url: url,
            },
        };
    } catch (error) {
        console.error('Error processing URL:', error);
        throw error;
    }
}

/**
 * MOCK AUTH FUNCTIONS
 * These are placeholders and should be replaced with actual API calls.
 */
// Fix: Added missing authentication functions.
export async function loginUser(username: string, password: string): Promise<User> {
    console.log('Logging in user:', username, password);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    if (password) { // Allow any non-empty password for demo
        return {
            user_id: `${username}_id`,
            username: username,
            email: `${username}@example.com`,
        }
    }
    throw new Error('Invalid credentials');
}

export async function registerUser(username: string, email: string, password: string): Promise<User> {
    console.log('Registering user:', username, email, password);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    if (!username || !email || !password) {
        throw new Error('All fields are required for registration.');
    }
    return {
        user_id: `${username}_id_${Date.now()}`,
        username: username,
        email: email,
    };
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
    console.log('Forgot password for email:', email);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    if (!email) {
        throw new Error('Email is required.');
    }
    return { message: 'Password reset link sent.' };
}
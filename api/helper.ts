// src/api/helper.ts

// --- Generic API Fetch Helper ---
export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
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

export const createApiQuery = (params: any): string => {
    // Filter out null, undefined, or empty string values from the parameters
    const filteredParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== '')
    );
    const queryString = new URLSearchParams(filteredParams as Record<string, string>).toString();
    return queryString ? `?${queryString}` : '';
}
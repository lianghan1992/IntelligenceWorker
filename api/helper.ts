
// src/api/helper.ts

// --- Generic API Fetch Helper ---
export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    
    // 关键修复：登录和注册请求不应携带旧的 Token，防止后端鉴权中间件在校验账号密码前先报错 401
    const isAuthRequest = url.includes('/login') || url.includes('/register');
    const token = localStorage.getItem('accessToken');
    
    if (token && !isAuthRequest) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    
    // Only set JSON content type if body is NOT FormData AND NOT URLSearchParams
    // We explicitly allow DELETE to have a body and Content-Type
    if (!(options.body instanceof FormData) && !(options.body instanceof URLSearchParams) && options.method !== 'GET') {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        // 关键修复：如果是正常的业务请求 Token 过期，则清除 Token 并刷新
        // 但如果是登录请求本身返回 401（账号密码错），则不应刷新页面，否则用户看不到报错信息
        if (!isAuthRequest) {
            localStorage.removeItem('accessToken');
            window.location.reload();
            throw new Error('认证失败，请重新登录。');
        }
        // 对于登录请求的 401，我们直接交给业务逻辑处理，不触发 reload
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
    const searchParams = new URLSearchParams();

    for (const key in params) {
        if (Object.prototype.hasOwnProperty.call(params, key)) {
            const value = params[key];

            // Skip null, undefined, and empty strings
            if (value === null || value === undefined || value === '') {
                continue;
            }

            if (Array.isArray(value)) {
                // For arrays, append each item if the array is not empty
                if (value.length > 0) {
                    value.forEach(item => searchParams.append(key, String(item)));
                }
            } else {
                // For other types, just append
                searchParams.append(key, String(value));
            }
        }
    }

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
};

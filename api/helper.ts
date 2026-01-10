
// src/api/helper.ts

// --- Generic API Fetch Helper ---
export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    
    // 强制检查：如果是登录/注册接口，绝对不发送 Authorization 头
    // 这可以防止后端中间件因为收到过期 Token 而提前拦截请求 (返回 401)
    const isPublicEndpoint = url.includes('/login') || url.includes('/register');
    const token = localStorage.getItem('accessToken');
    
    if (token && !isPublicEndpoint) {
        headers.set('Authorization', `Bearer ${token}`);
    } else if (isPublicEndpoint) {
        // 调试日志：确保在登录时不发送 Token
        console.debug(`[AutoInsight] Skipping Auth header for public endpoint: ${url}`);
    }
    
    // Auto-set JSON content type
    if (!(options.body instanceof FormData) && !(options.body instanceof URLSearchParams) && options.method !== 'GET') {
        headers.set('Content-Type', 'application/json');
    }

    try {
        const response = await fetch(url, { ...options, headers });

        if (response.status === 401) {
            // 如果是普通业务接口报 401，说明 Token 过期，需要踢出用户
            // 如果是登录接口报 401，说明密码错误，不应刷新页面
            if (!isPublicEndpoint) {
                console.warn('[AutoInsight] Session expired, redirecting to login.');
                localStorage.removeItem('accessToken');
                window.location.reload();
                throw new Error('会话已过期，请重新登录。');
            }
            // 登录接口的 401 交给后续的 response.json() 处理错误信息
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
            throw new Error(errorData.message || `请求失败 (${response.status})`);
        }
        
        // Handle 204 No Content
        if (response.status === 204) {
            return {} as T;
        }

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return response.json();
        }
        
        return {} as T;
    } catch (error) {
        // 捕获网络错误等
        throw error;
    }
}

export const createApiQuery = (params: any): string => {
    const searchParams = new URLSearchParams();

    for (const key in params) {
        if (Object.prototype.hasOwnProperty.call(params, key)) {
            const value = params[key];

            if (value === null || value === undefined || value === '') {
                continue;
            }

            if (Array.isArray(value)) {
                if (value.length > 0) {
                    value.forEach(item => searchParams.append(key, String(item)));
                }
            } else {
                searchParams.append(key, String(value));
            }
        }
    }

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
};

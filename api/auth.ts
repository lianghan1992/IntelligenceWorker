
// src/api/auth.ts

import { USER_SERVICE_PATH } from '../config';
import { User } from '../types';
import { apiFetch } from './helper';

// --- Auth API ---
export const login = (email: string, password: string): Promise<{ accessToken: string; user: User }> => {
    // 关键修改：使用 URLSearchParams 构建表单数据
    // 许多后端框架（如 FastAPI, Spring Security）的登录接口默认要求 application/x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append('username', email); // 标准 OAuth2 字段名是 username，但值我们传 email
    formData.append('password', password);
    // 为了最大化兼容性，我们也额外传一个 email 字段，防止后端是自定义逻辑
    formData.append('email', email);

    return apiFetch<{ accessToken: string; user: User }>(`${USER_SERVICE_PATH}/login`, {
        method: 'POST',
        // apiFetch 会自动检测到 body 是 URLSearchParams 并设置正确的 Content-Type，
        // 但显式指定更安全
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
    });
};

export const register = (username: string, email: string, password: string): Promise<{ message: string }> =>
    // 注册接口通常仍然接受 JSON，保持不变
    apiFetch<{ message: string }>(`${USER_SERVICE_PATH}/register`, {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
    });

export const getMe = (): Promise<User> => apiFetch<User>(`${USER_SERVICE_PATH}/me`);

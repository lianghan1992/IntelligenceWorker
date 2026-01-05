
// src/api/auth.ts

import { USER_SERVICE_PATH } from '../config';
import { User } from '../types';
import { apiFetch } from './helper';

// --- Auth API ---
export const login = (email: string, password: string): Promise<{ accessToken: string; user: User }> =>
    // 移除末尾斜杠，避免 307 Temporary Redirect，确保 POST 请求体能正确到达后端
    apiFetch<{ accessToken: string; user: User }>(`${USER_SERVICE_PATH}/login`, {
        method: 'POST',
        body: JSON.stringify({ 
            email, 
            username: email, // 增加冗余字段，有些后端框架（如 FastAPI Security）默认读取 username 字段
            password 
        }),
    });

export const register = (username: string, email: string, password: string): Promise<{ message: string }> =>
    // 移除末尾斜杠
    apiFetch<{ message: string }>(`${USER_SERVICE_PATH}/register`, {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
    });

export const getMe = (): Promise<User> => apiFetch<User>(`${USER_SERVICE_PATH}/me`);

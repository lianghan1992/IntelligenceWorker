
// src/api/auth.ts

import { USER_SERVICE_PATH } from '../config';
import { User } from '../types';
import { apiFetch } from './helper';

// --- Auth API ---
export const login = (email: string, password: string): Promise<{ accessToken: string; user: User }> => {
    // 严格遵循 API 文档：使用 JSON 格式发送 email 和 password
    // 之前尝试的 URLSearchParams (Form Data) 可能导致后端无法解析 JSON body，从而报 401
    return apiFetch<{ accessToken: string; user: User }>(`${USER_SERVICE_PATH}/login`, {
        method: 'POST',
        body: JSON.stringify({ 
            email, 
            password 
        }),
    });
};

export const register = (username: string, email: string, password: string): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`${USER_SERVICE_PATH}/register`, {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
    });

export const getMe = (): Promise<User> => apiFetch<User>(`${USER_SERVICE_PATH}/me`);

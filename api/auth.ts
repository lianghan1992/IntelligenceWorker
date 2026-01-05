
// src/api/auth.ts

import { USER_SERVICE_PATH } from '../config';
import { User } from '../types';
import { apiFetch } from './helper';

// --- Auth API ---
export const login = (email: string, password: string): Promise<{ accessToken: string; user: User }> =>
    // 添加末尾斜杠以适配某些后端配置，防止 POST 被 307 重定向导致丢失 Body
    apiFetch<{ accessToken: string; user: User }>(`${USER_SERVICE_PATH}/login/`, {
        method: 'POST',
        body: JSON.stringify({ 
            email, 
            username: email, // 增加冗余字段，有些后端框架（如 FastAPI Security）默认读取 username 字段
            password 
        }),
    });

export const register = (username: string, email: string, password: string): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`${USER_SERVICE_PATH}/register/`, {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
    });

export const getMe = (): Promise<User> => apiFetch<User>(`${USER_SERVICE_PATH}/me/`);

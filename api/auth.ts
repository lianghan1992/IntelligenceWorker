
// src/api/auth.ts

import { USER_SERVICE_PATH } from '../config';
import { User } from '../types';
import { apiFetch } from './helper';

// --- Auth API ---
export const login = (email: string, password: string): Promise<{ accessToken: string; user: User }> => {
    // 增加 trim() 以防止复制粘贴时首尾带空格导致后端校验失败
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    return apiFetch<{ accessToken: string; user: User }>(`${USER_SERVICE_PATH}/login`, {
        method: 'POST',
        body: JSON.stringify({ 
            email: cleanEmail, 
            password: cleanPassword 
        }),
    });
};

export const register = (username: string, email: string, password: string): Promise<{ message: string }> => {
    const cleanUsername = username.trim();
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    return apiFetch<{ message: string }>(`${USER_SERVICE_PATH}/register`, {
        method: 'POST',
        body: JSON.stringify({ 
            username: cleanUsername, 
            email: cleanEmail, 
            password: cleanPassword 
        }),
    });
};

export const getMe = (): Promise<User> => apiFetch<User>(`${USER_SERVICE_PATH}/me`);

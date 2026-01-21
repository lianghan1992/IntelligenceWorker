
// src/api/auth.ts

import { USER_SERVICE_PATH } from '../config';
import { User } from '../types';
import { apiFetch } from './helper';

// --- Auth API ---
export const login = async (email: string, password: string): Promise<{ accessToken: string; user: User }> => {
    // 增加 trim() 以防止复制粘贴时首尾带空格导致后端校验失败
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    // 【关键修复】在发起登录请求前，主动清除本地可能存在的旧 Token
    // 这确保了 apiFetch 即使读取 localStorage 也读不到 Token，从而绝对不会发送 Authorization 头
    // 比依赖 URL 判断更安全、更彻底
    localStorage.removeItem('accessToken');

    return apiFetch<{ accessToken: string; user: User }>(`${USER_SERVICE_PATH}/login`, {
        method: 'POST',
        body: JSON.stringify({ 
            email: cleanEmail, 
            password: cleanPassword 
        }),
    });
};

export const register = (username: string, email: string, password: string): Promise<{ message: string; user_id: string; email: string }> => {
    const cleanUsername = username.trim();
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    // 注册时同样清除旧 Token
    localStorage.removeItem('accessToken');

    return apiFetch<{ message: string; user_id: string; email: string }>(`${USER_SERVICE_PATH}/register`, {
        method: 'POST',
        body: JSON.stringify({ 
            username: cleanUsername, 
            email: cleanEmail, 
            password: cleanPassword 
        }),
    });
};

export const requestPasswordRecovery = (email: string): Promise<{ message: string }> => {
    return apiFetch<{ message: string }>(`${USER_SERVICE_PATH}/password-recovery`, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
    });
};

export const resetPassword = (token: string, new_password: string): Promise<{ message: string }> => {
    return apiFetch<{ message: string }>(`${USER_SERVICE_PATH}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ 
            token: token.trim(), 
            new_password: new_password.trim() 
        }),
    });
};

export const getMe = (): Promise<User> => apiFetch<User>(`${USER_SERVICE_PATH}/me`);

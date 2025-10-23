// src/api/auth.ts

import { USER_SERVICE_PATH } from '../config';
import { User } from '../types';
import { apiFetch } from './helper';

// --- Auth API ---
export const login = (email: string, password: string): Promise<{ accessToken: string; user: User }> =>
    apiFetch<{ accessToken: string; user: User }>(`${USER_SERVICE_PATH}/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });

export const register = (username: string, email: string, password: string): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`${USER_SERVICE_PATH}/register`, {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
    });

export const getMe = (): Promise<User> => apiFetch<User>(`${USER_SERVICE_PATH}/me`);

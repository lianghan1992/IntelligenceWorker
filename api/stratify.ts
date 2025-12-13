
// src/api/stratify.ts

import { STRATIFY_SERVICE_PATH } from '../config';
import { StratifyTask, StratifyQueueStatus } from '../types';
import { apiFetch, createApiQuery } from './helper';

// 1. Queue Status
export const getStratifyQueueStatus = (): Promise<StratifyQueueStatus> =>
    apiFetch<StratifyQueueStatus>(`${STRATIFY_SERVICE_PATH}/queue/status`);

// 2. Task Management
export const createStratifyTask = (userInput: string): Promise<StratifyTask> =>
    apiFetch<StratifyTask>(`${STRATIFY_SERVICE_PATH}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ user_input: userInput }),
    });

export const getStratifyTasks = (params: { skip?: number; limit?: number }): Promise<StratifyTask[]> => {
    const query = createApiQuery(params);
    return apiFetch<StratifyTask[]>(`${STRATIFY_SERVICE_PATH}/tasks${query}`);
};

export const getStratifyTask = (taskId: string): Promise<StratifyTask> =>
    apiFetch<StratifyTask>(`${STRATIFY_SERVICE_PATH}/tasks/${taskId}`);

// 3. Revision & Generation
export const reviseStratifyOutline = (taskId: string, revisionRequest: string): Promise<{ status: string; message: string }> =>
    apiFetch<{ status: string; message: string }>(`${STRATIFY_SERVICE_PATH}/tasks/${taskId}/outline/revise`, {
        method: 'POST',
        body: JSON.stringify({ revision_request: revisionRequest }),
    });

export const reviseStratifyPageContent = (taskId: string, pageIndex: number, modificationOpinion: string): Promise<{ status: string; message: string }> =>
    apiFetch<{ status: string; message: string }>(`${STRATIFY_SERVICE_PATH}/tasks/${taskId}/pages/${pageIndex}/revise`, {
        method: 'POST',
        body: JSON.stringify({ modification_opinion: modificationOpinion }),
    });

export const generateStratifyPageHtml = (taskId: string, pageIndex: number): Promise<{ status: string; message: string }> =>
    apiFetch<{ status: string; message: string }>(`${STRATIFY_SERVICE_PATH}/tasks/${taskId}/pages/${pageIndex}/generate_html`, {
        method: 'POST',
    });

// 4. Workflow Control

export const confirmStratifyOutline = (taskId: string): Promise<void> => {
    return apiFetch<void>(`${STRATIFY_SERVICE_PATH}/tasks/${taskId}/outline/confirm`, {
        method: 'POST'
    });
};

export const generateStratifyFullContent = (taskId: string): Promise<void> => {
    return apiFetch<void>(`${STRATIFY_SERVICE_PATH}/tasks/${taskId}/pages/generate_all`, {
        method: 'POST'
    });
};

export const downloadStratifyPdf = async (taskId: string): Promise<Blob> => {
    const url = `${STRATIFY_SERVICE_PATH}/tasks/${taskId}/pdf`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    
    const response = await fetch(url, { headers });
    if (!response.ok) {
        let errorMsg = '下载 PDF 失败';
        try {
            const errData = await response.json();
            errorMsg = errData.message || errorMsg;
        } catch(e) {}
        throw new Error(errorMsg);
    }
    return response.blob();
};

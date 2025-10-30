// src/api/documentProcessing.ts

import { DOCUMENT_PROCESSING_SERVICE_PATH } from '../config';
import { DocumentTask, PaginatedDocumentsResponse } from '../types';
import { apiFetch, createApiQuery } from './helper';

export const getDocuments = (params: any): Promise<PaginatedDocumentsResponse> => {
    const query = createApiQuery(params);
    return apiFetch<PaginatedDocumentsResponse>(`${DOCUMENT_PROCESSING_SERVICE_PATH}/documents${query}`);
}

export const uploadDocument = (file: File): Promise<{ document_id: string; filename: string; message: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch( `${DOCUMENT_PROCESSING_SERVICE_PATH}/upload`, {
        method: 'POST',
        body: formData,
    });
};

export const deleteDocument = (documentId: string): Promise<{ message: string }> => {
    return apiFetch(`${DOCUMENT_PROCESSING_SERVICE_PATH}/documents/${documentId}`, {
        method: 'DELETE',
    });
};

export const regenerateHtml = (documentId: string): Promise<{ message: string }> => {
    return apiFetch(`${DOCUMENT_PROCESSING_SERVICE_PATH}/documents/${documentId}/regenerate-html`, {
        method: 'POST',
        body: JSON.stringify({ delete_old: true }),
    });
};

export const downloadHtml = async (documentId: string): Promise<Blob> => {
    const url = `${DOCUMENT_PROCESSING_SERVICE_PATH}/documents/${documentId}/download-html`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
        throw new Error('下载失败');
    }
    return response.blob();
};

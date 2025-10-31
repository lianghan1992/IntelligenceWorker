// src/api/documentProcessing.ts

import { DOCUMENT_PROCESSING_SERVICE_PATH } from '../config';
import { DocumentTask, PaginatedDocumentsResponse } from '../types';
import { apiFetch, createApiQuery } from './helper';

export const getDocuments = (params: any): Promise<PaginatedDocumentsResponse> => {
    const query = createApiQuery(params);
    // FIX: The base path now includes /documents, so we don't need to add it again.
    return apiFetch<PaginatedDocumentsResponse>(`${DOCUMENT_PROCESSING_SERVICE_PATH}${query}`);
}

export const uploadDocument = (file: File): Promise<{ document_id: string; filename: string; message: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    // This endpoint is /documents/upload, which is correct with the new base path
    return apiFetch( `${DOCUMENT_PROCESSING_SERVICE_PATH}/upload`, {
        method: 'POST',
        body: formData,
    });
};

export const deleteDocument = (documentId: string): Promise<{ message: string }> => {
    // FIX: Path should be /documents/{id}, not /documents/documents/{id}
    return apiFetch(`${DOCUMENT_PROCESSING_SERVICE_PATH}/${documentId}`, {
        method: 'DELETE',
    });
};

export const regenerateHtml = (documentId: string): Promise<{ message: string }> => {
    // FIX: Path should be /documents/{id}/regenerate-html
    return apiFetch(`${DOCUMENT_PROCESSING_SERVICE_PATH}/${documentId}/regenerate-html`, {
        method: 'POST',
        body: JSON.stringify({ delete_old: true }),
    });
};

export const downloadHtml = async (documentId: string): Promise<Blob> => {
    // FIX: Path should be /documents/{id}/download-html
    const url = `${DOCUMENT_PROCESSING_SERVICE_PATH}/${documentId}/download-html`;
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
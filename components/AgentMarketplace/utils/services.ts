
import { API_BASE_URL } from '../../../config';

// Define service path locally or import. 
// Using the config value ensures consistency.
const STRATIFY_SERVICE_PATH = `${API_BASE_URL}/stratifyai`;

export const generatePdf = async (htmlContent: string, filename?: string, options?: { width?: number; height?: number }): Promise<Blob> => {
    let url = `${STRATIFY_SERVICE_PATH}/generate/pdf`;
    
    // Append dimensions as query parameters if provided
    if (options) {
        const params = new URLSearchParams();
        if (options.width) params.append('width', options.width.toString());
        if (options.height) params.append('height', options.height.toString());
        const qs = params.toString();
        if (qs) url += `?${qs}`;
    }

    const token = localStorage.getItem('accessToken');
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ html_content: htmlContent, filename }),
    });
    if (!response.ok) {
        throw new Error('PDF 生成失败');
    }
    return response.blob();
};

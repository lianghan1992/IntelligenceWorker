
import { API_BASE_URL } from '../../../config';

// Define service path locally or import. 
// Using the config value ensures consistency.
const STRATIFY_SERVICE_PATH = `${API_BASE_URL}/stratifyai`;

export const generatePdf = async (htmlContent: string, filename?: string): Promise<Blob> => {
    const url = `${STRATIFY_SERVICE_PATH}/generate/pdf`;
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

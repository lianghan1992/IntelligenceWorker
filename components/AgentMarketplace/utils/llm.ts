
// components/AgentMarketplace/utils/llm.ts
import { STRATIFY_SERVICE_PATH } from '../../../config';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | any[]; // Support multimodal content in future
}

/**
 * Streaming Chat Completion via StratifyAI Gateway
 * Supports OpenRouter, Gemini, etc. via the backend gateway.
 */
export async function streamOpenRouterChat(
    messages: ChatMessage[],
    onToken: (token: string) => void,
    onDone: () => void,
    onError: (error: Error) => void,
    model: string = "openrouter@google/gemini-2.0-flash-lite-preview-02-05:free", // Default cost-effective model with channel prefix
    sessionId?: string
) {
    try {
        const token = localStorage.getItem('accessToken');
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        if (sessionId) {
            headers['X-Session-ID'] = sessionId;
        }

        // Updated endpoint to match StratifyAI v1 gateway
        const response = await fetch(`${STRATIFY_SERVICE_PATH}/v1/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: model,
                messages: messages,
                stream: true,
                temperature: 0.7,
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMsg = `API Error (${response.status}): ${errorText}`;
            if (response.status === 401) errorMsg = "认证失败: 请重新登录。";
            if (response.status === 403) errorMsg = "权限不足: 请检查账户余额或权限。";
            throw new Error(errorMsg);
        }

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let done = false;

        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            if (value) {
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.slice(6).trim();
                        if (jsonStr === '[DONE]') break;

                        try {
                            const parsed = JSON.parse(jsonStr);
                            const content = parsed.choices?.[0]?.delta?.content || "";
                            if (content) {
                                onToken(content);
                            }
                        } catch (e) {
                            // Ignore parse errors for partial chunks
                        }
                    }
                }
            }
        }
        onDone();
    } catch (error) {
        console.error("LLM Stream Failed:", error);
        onError(error instanceof Error ? error : new Error(String(error)));
    }
}

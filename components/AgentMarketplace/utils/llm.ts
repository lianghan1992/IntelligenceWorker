
// components/AgentMarketplace/utils/llm.ts

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * OpenRouter Streaming Chat Completion via Nginx Proxy
 */
export async function streamOpenRouterChat(
    messages: ChatMessage[],
    onToken: (token: string) => void,
    onDone: () => void,
    onError: (error: Error) => void,
    model: string = "google/gemini-2.0-flash-lite-preview-02-05:free" // Default cost-effective model
) {
    try {
        const response = await fetch('/openrouter/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Authorization header is injected by Nginx
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                stream: true,
                temperature: 0.7,
                // Optional: headers for OpenRouter specific handling
                // "HTTP-Referer": window.location.href, 
            })
        });

        if (!response.ok) {
            let errorMsg = `API Error: ${response.status}`;
            if (response.status === 403) errorMsg = "403 Forbidden: 请检查域名是否合法或服务器配置。";
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

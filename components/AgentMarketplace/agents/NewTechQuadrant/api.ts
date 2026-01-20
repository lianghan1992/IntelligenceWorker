
export const streamGeminiChat = async (
    params: {
        model: string;
        messages: any[];
        stream?: boolean;
        temperature?: number;
    },
    apiKey: string,
    onData: (data: { content?: string }) => void,
    onDone?: () => void,
    onError?: (err: any) => void
) => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };

    try {
        console.log('[GeminiAPI] Requesting:', params.model);
        // Use the proxy path '/gemini-api'
        const response = await fetch('/gemini-api/v1/chat/completions', {
            method: 'POST',
            headers,
            body: JSON.stringify({ ...params, stream: true }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('[GeminiAPI] Error:', response.status, errText);
            throw new Error(`API Error ${response.status}: ${errText}`);
        }

        const contentType = response.headers.get('content-type');

        // Handle Non-Streaming Response (JSON)
        if (contentType && contentType.includes('application/json')) {
            const json = await response.json();
            // Standard OpenAI format: choices[0].message.content
            const content = json.choices?.[0]?.message?.content;
            if (content) {
                onData({ content });
            }
            if (onDone) onDone();
            return;
        }

        // Handle Streaming Response (SSE)
        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;

                const jsonStr = trimmed.slice(6).trim();
                if (jsonStr === '[DONE]') continue;

                try {
                    const json = JSON.parse(jsonStr);
                    // Standard OpenAI stream format: choices[0].delta.content
                    const content = json.choices?.[0]?.delta?.content;
                    if (content) {
                        onData({ content });
                    }
                } catch (e) {
                    // ignore partial chunks
                }
            }
        }
        if (onDone) onDone();

    } catch (e) {
        console.error('[GeminiAPI] Exception:', e);
        if (onError) onError(e);
    }
};

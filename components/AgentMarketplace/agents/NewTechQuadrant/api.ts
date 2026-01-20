
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
        // Use the proxy path '/gemini-api' instead of the direct URL
        const response = await fetch('/gemini-api/v1/chat/completions', {
            method: 'POST',
            headers,
            body: JSON.stringify({ ...params, stream: true }),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API Error ${response.status}: ${errText}`);
        }

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
                    const content = json.choices?.[0]?.delta?.content;
                    if (content) {
                        onData({ content });
                    }
                } catch (e) {
                    // ignore
                }
            }
        }
        if (onDone) onDone();

    } catch (e) {
        if (onError) onError(e);
    }
};

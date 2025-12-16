
// --- 核心解析器：分离思考与JSON ---
export const extractThoughtAndJson = (text: string) => {
    let thought = '';
    let jsonPart = '';
    let hasJsonStart = false;

    // 1. 尝试寻找标准 Markdown 代码块
    const codeBlockRegex = /```json\s*([\s\S]*)/i;
    const codeBlockMatch = text.match(codeBlockRegex);

    if (codeBlockMatch && codeBlockMatch.index !== undefined) {
        thought = text.slice(0, codeBlockMatch.index).trim();
        jsonPart = codeBlockMatch[1]; // 取代码块之后的内容
        // 去掉可能的结尾 ```
        const endBlockIndex = jsonPart.lastIndexOf('```');
        if (endBlockIndex !== -1) {
            jsonPart = jsonPart.slice(0, endBlockIndex);
        }
        hasJsonStart = true;
    } else {
        // 2. 兜底：寻找第一个 '{'，假设它是 JSON 的开始
        const jsonStartIndex = text.indexOf('{');
        if (jsonStartIndex !== -1) {
            thought = text.slice(0, jsonStartIndex).trim();
            jsonPart = text.slice(jsonStartIndex);
            hasJsonStart = true;
        } else {
            // 3. 纯思考阶段
            thought = text;
            jsonPart = '';
        }
    }

    return { thought, jsonPart, hasJsonStart };
};

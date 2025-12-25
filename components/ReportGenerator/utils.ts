
/**
 * 解析混合了思考过程（<think>标签）和实际内容的流式文本
 */
export const extractThoughtAndJson = (text: string) => {
    // 匹配 <think>...</think> 内容
    // 注意：流式传输时标签可能未闭合，这里做简单处理，实际可能需要流式解析器
    // 简单正则提取已闭合的思考部分
    const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
    let match;
    let thought = '';
    let lastIndex = 0;
    
    // 提取所有闭合的 think 块
    while ((match = thinkRegex.exec(text)) !== null) {
        thought += match[1] + '\n';
        lastIndex = thinkRegex.lastIndex;
    }

    // 检查是否有未闭合的 <think> (位于末尾)
    const openThinkMatch = text.indexOf('<think>', lastIndex);
    if (openThinkMatch !== -1) {
        thought += text.slice(openThinkMatch + 7); // +7 is length of <think>
    }

    // 移除所有 <think>...</think> 标签及其内容，得到纯净的输出
    // 注意：如果有未闭合的 think，说明当前还在思考，Main content 应该还没开始或者暂停了
    let jsonPart = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    
    // 如果有未闭合的 think，要把未闭合部分也去掉
    if (openThinkMatch !== -1) {
        jsonPart = jsonPart.slice(0, openThinkMatch - lastIndex).trim();
    }

    return { thought: thought.trim(), jsonPart };
};

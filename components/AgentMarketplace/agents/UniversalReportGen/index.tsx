
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { streamChatCompletions } from '../../../../api/stratify';
import { searchSemanticBatchGrouped } from '../../../../api/intelligence';
import { SharedChatPanel, ChatMessage } from '../../../../components/shared/ChatPanel';
import { ReportCanvas, ReportSection, SectionStatus } from './ReportCanvas';

// --- Helpers ---
const tryParseJson = (str: string) => {
    try {
        // 尝试提取 Markdown 代码块中的 JSON
        const match = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) return JSON.parse(match[1]);
        // 尝试直接解析
        return JSON.parse(str);
    } catch (e) {
        return null;
    }
};

const extractListFromText = (text: string): string[] => {
    // 尝试解析 JSON 数组
    const json = tryParseJson(text);
    if (Array.isArray(json)) return json;
    
    // 降级：按行提取
    return text.split('\n')
        .map(line => line.replace(/^\d+\.\s*|-\s*/, '').trim())
        .filter(line => line.length > 2);
};

// --- Models ---
const PLANNING_MODEL = "openrouter@google/gemini-2.0-flash-lite-preview-02-05:free";
const WRITING_MODEL = "openrouter@google/gemini-2.0-flash-lite-preview-02-05:free";

const UniversalReportGen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    // 全局状态
    const [mainStatus, setMainStatus] = useState<'idle' | 'planning' | 'review' | 'generating' | 'finished'>('idle');
    const [topic, setTopic] = useState('');
    const [outline, setOutline] = useState<{ title: string; instruction: string }[]>([]);
    const [sections, setSections] = useState<ReportSection[]>([]);
    const [currentSectionIdx, setCurrentSectionIdx] = useState<number>(-1);
    
    // 聊天面板状态
    const [messages, setMessages] = useState<ChatMessage[]>([{
        id: 'init',
        role: 'assistant',
        content: '我是您的深度研报助手。请输入您想研究的主题（例如：“2024年中国人形机器人产业分析”），我将为您规划全篇大纲并自动撰写。',
        timestamp: Date.now()
    }]);

    const abortControllerRef = useRef<AbortController | null>(null);

    // --- 1. 用户输入处理 & 大纲规划 ---
    const handleUserMessage = async (text: string) => {
        if (!text.trim()) return;
        
        // 如果正在生成中，禁止输入（或者视为修改指令，目前简化为禁止）
        if (mainStatus === 'generating' || mainStatus === 'planning') return;

        const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);

        if (mainStatus === 'idle') {
            // 开始规划大纲
            setTopic(text);
            await planOutline(text);
        } else if (mainStatus === 'review') {
            // 修改大纲指令
            await planOutline(text, true); // true 表示是修改
        }
    };

    const planOutline = async (query: string, isRevision = false) => {
        setMainStatus('planning');
        const prompt = isRevision 
            ? `用户对大纲有修改意见：“${query}”。请重新输出完整的 JSON 大纲。`
            : `你是一个专业的研报架构师。请针对主题【${query}】规划一份深度研究报告的大纲。
要求：
1. 包含 4-6 个核心章节。
2. 每个章节必须有明确的写作指导（instruction）。
3. **必须**且**仅**返回以下 JSON 格式，不要包含多余废话：
\`\`\`json
{
  "title": "报告主标题",
  "chapters": [
    { "title": "第一章标题", "instruction": "本章分析重点..." }
  ]
}
\`\`\``;

        let buffer = "";
        try {
            await streamChatCompletions({
                model: PLANNING_MODEL,
                messages: [{ role: 'user', content: prompt }],
                stream: true,
                temperature: 0.3
            }, (chunk) => {
                if (chunk.content) buffer += chunk.content;
            });

            const parsed = tryParseJson(buffer);
            if (parsed && Array.isArray(parsed.chapters)) {
                setOutline(parsed.chapters);
                if (parsed.title) setTopic(parsed.title);
                
                setMessages(prev => [...prev, {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: '大纲已生成（见左侧）。\n\n您可以：\n1. 点击“确认大纲”开始撰写。\n2. 继续输入指令调整大纲。',
                    timestamp: Date.now()
                }]);
                setMainStatus('review');
            } else {
                throw new Error("格式解析失败");
            }
        } catch (e) {
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: '大纲规划遇到问题，请重试或更换主题。',
                timestamp: Date.now()
            }]);
            setMainStatus('idle');
        }
    };

    // --- 2. 启动生成流水线 ---
    const handleStartGeneration = () => {
        if (outline.length === 0) return;
        
        // 初始化所有章节状态
        const initialSections: ReportSection[] = outline.map((item, idx) => ({
            id: `sec-${idx}`,
            title: item.title,
            instruction: item.instruction,
            content: '',
            status: 'pending',
            logs: [],
            references: []
        }));
        
        setSections(initialSections);
        setMainStatus('generating');
        setCurrentSectionIdx(0); // 触发 useEffect 开始处理第0章
    };

    // --- 3. 核心流水线控制 ---
    useEffect(() => {
        if (mainStatus !== 'generating') return;
        if (currentSectionIdx < 0 || currentSectionIdx >= sections.length) {
            if (currentSectionIdx >= sections.length) {
                setMainStatus('finished'); // 全部完成
            }
            return;
        }

        processSection(currentSectionIdx);
    }, [currentSectionIdx, mainStatus]);

    const updateSection = (idx: number, updates: Partial<ReportSection>) => {
        setSections(prev => {
            const newSections = [...prev];
            newSections[idx] = { ...newSections[idx], ...updates };
            return newSections;
        });
    };

    const addLog = (idx: number, message: string) => {
        setSections(prev => {
            const newSections = [...prev];
            newSections[idx] = { 
                ...newSections[idx], 
                logs: [...(newSections[idx].logs || []), message] 
            };
            return newSections;
        });
    };

    // 单个章节的完整处理逻辑
    const processSection = async (idx: number) => {
        const section = sections[idx];
        if (section.status === 'completed') return; // 防止重入

        abortControllerRef.current = new AbortController();

        try {
            // --- Phase A: Planning Search (规划) ---
            updateSection(idx, { status: 'planning' });
            addLog(idx, "正在分析章节意图...");
            
            const planQueryPrompt = `针对章节【${section.title}】（重点：${section.instruction}），请生成 3 个用于搜索引擎的关键词。仅返回关键词列表，每行一个。`;
            let queriesStr = "";
            await streamChatCompletions({
                model: PLANNING_MODEL,
                messages: [{ role: 'user', content: planQueryPrompt }],
                stream: true,
                temperature: 0.1
            }, (c) => { if(c.content) queriesStr += c.content });
            
            const queries = extractListFromText(queriesStr).slice(0, 3);
            addLog(idx, `生成检索词: ${queries.join(', ')}`);

            // --- Phase B: Searching (搜集) ---
            updateSection(idx, { status: 'searching' });
            addLog(idx, "正在执行全网深度检索...");
            
            let referencesText = "";
            let refList: any[] = [];
            
            if (queries.length > 0) {
                try {
                    const searchRes = await searchSemanticBatchGrouped({
                        query_texts: queries,
                        max_segments_per_query: 4 // 每个词取4条
                    });
                    
                    const allItems = (searchRes.results || []).flatMap((r: any) => r.items || []);
                    // 去重
                    const uniqueItems = Array.from(new Map(allItems.map((item:any) => [item.article_id, item])).values());
                    
                    refList = uniqueItems.map((item: any) => ({
                        title: item.title,
                        url: item.url,
                        source: item.source_name
                    }));

                    referencesText = uniqueItems.map((item: any, i: number) => 
                        `[文献${i+1}] ${item.title} (${item.source_name}):\n${item.segments.map((s:any) => s.content).join('\n')}`
                    ).join('\n\n');

                    updateSection(idx, { references: refList });
                    addLog(idx, `检索完成，获取 ${refList.length} 篇相关资料`);
                } catch (e) {
                    addLog(idx, "检索服务响应超时，将使用通用知识库");
                }
            } else {
                addLog(idx, "未生成有效关键词，跳过检索");
            }

            // --- Phase C: Writing (撰写) ---
            updateSection(idx, { status: 'writing' });
            addLog(idx, "开始构建正文逻辑...");

            const writePrompt = `你是一位行业分析专家。请根据以下参考资料，撰写报告章节。
章节标题：${section.title}
核心要求：${section.instruction}
参考资料：
${referencesText || "（无外部资料，请基于你的专业知识撰写）"}

要求：
1. 使用 Markdown 格式。
2. 逻辑严密，数据详实，引用资料时请自然融入。
3. 字数要求：800字左右。
4. 直接输出正文，不要有开场白。`;

            let contentBuffer = "";
            await streamChatCompletions({
                model: WRITING_MODEL,
                messages: [{ role: 'user', content: writePrompt }],
                stream: true,
                temperature: 0.4 // 稍微增加创造性
            }, (chunk) => {
                if (chunk.content) {
                    contentBuffer += chunk.content;
                    updateSection(idx, { content: contentBuffer });
                }
            });

            // --- Finish ---
            updateSection(idx, { status: 'completed' });
            
            // 自动进入下一章
            setCurrentSectionIdx(idx + 1);

        } catch (e: any) {
            console.error(e);
            updateSection(idx, { status: 'error' });
            addLog(idx, `发生错误: ${e.message}`);
            // 注意：出错时不自动跳下一章，等待用户手动重试
        }
    };

    const handleRetrySection = (idx: number) => {
        // 重置该章节状态并重新触发
        updateSection(idx, { status: 'pending', logs: [], content: '', references: [] });
        setCurrentSectionIdx(idx);
    };

    return (
        <div className="flex h-full w-full bg-[#f8fafc]">
            {/* 左侧：可视化画布 */}
            <div className="flex-1 overflow-hidden border-r border-slate-200 relative">
                <ReportCanvas 
                    mainStatus={mainStatus}
                    topic={topic}
                    outline={outline}
                    sections={sections}
                    currentSectionIdx={currentSectionIdx}
                    onStart={handleStartGeneration}
                    onRetry={handleRetrySection}
                />
            </div>
            
            {/* 右侧：极简聊天栏 (用于输入指令) */}
            <div className="w-[360px] flex-shrink-0 bg-white shadow-xl z-10 h-full flex flex-col">
                <SharedChatPanel 
                    messages={messages}
                    onSendMessage={handleUserMessage}
                    isGenerating={mainStatus === 'generating' || mainStatus === 'planning'}
                    placeholder={mainStatus === 'idle' ? "输入研报主题..." : "输入修改建议或指令..."}
                    title="研报 Copilot"
                />
            </div>
        </div>
    );
};

export default UniversalReportGen;

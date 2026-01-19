
import React, { useState, useEffect } from 'react';
import { ArticleSelectionStep } from './ArticleSelectionStep';
import { AnalysisWorkspace } from './AnalysisWorkspace';
import { ArticlePublic, StratifyPrompt } from '../../../../types';
import { getPrompts, streamChatCompletions } from '../../../../api/stratify';
import { searchSemanticSegments } from '../../../../api/intelligence';

export interface TechItem {
    id: string;
    name: string;
    field: string;
    description: string;
    status: string;
    original_url?: string;
    sourceArticleTitle?: string; // Track source for clarity
    // Selection state for generation phase
    isSelected: boolean;
    // Analysis State
    analysisState: 'idle' | 'analyzing' | 'review' | 'generating_html' | 'done' | 'error';
    markdownContent?: string;
    markdownDetail?: string; // For streaming display
    htmlContent?: string;
    htmlCode?: string; // For streaming display
    logs?: string[];
}

export interface ExtractionProgress {
    current: number;
    total: number;
    currentTitle: string;
}

const SCENARIO_ID = '5e99897c-6d91-4c72-88e5-653ea162e52b';
// 默认兜底模型，仅在提示词未配置时使用
const FALLBACK_MODEL = 'zhipu@glm-4.5-flash';

// Helper: Robustly extract JSON array from text
const extractJsonArray = (text: string): any[] | null => {
    if (!text) return null;
    
    // 1. Try finding the first '['
    const startIndex = text.indexOf('[');
    if (startIndex === -1) return null;

    // 2. Iterate to find the matching closing ']' using a stack counter
    let bracketCount = 0;
    let endIndex = -1;
    let inString = false;
    let isEscaped = false;

    for (let i = startIndex; i < text.length; i++) {
        const char = text[i];
        
        if (isEscaped) {
            isEscaped = false;
            continue;
        }
        
        if (char === '\\') {
            isEscaped = true;
            continue;
        }
        
        if (char === '"') {
            inString = !inString;
            continue;
        }
        
        if (!inString) {
            if (char === '[') {
                bracketCount++;
            } else if (char === ']') {
                bracketCount--;
                if (bracketCount === 0) {
                    endIndex = i;
                    break;
                }
            }
        }
    }

    if (endIndex !== -1) {
        const jsonStr = text.substring(startIndex, endIndex + 1);
        try {
            const result = JSON.parse(jsonStr);
            if (Array.isArray(result)) return result;
        } catch (e) {
            console.warn("JSON parse failed on extracted string:", jsonStr);
        }
    }
    
    // Fallback: Attempt to clean up markdown code blocks if the above failed
    const codeBlockMatch = text.match(/```(?:json)?([\s\S]*?)```/);
    if (codeBlockMatch) {
        try {
            const result = JSON.parse(codeBlockMatch[1]);
            if (Array.isArray(result)) return result;
        } catch (e) {}
    }

    return null;
};

// Helper: Robustly extract HTML from text
const extractCleanHtml = (text: string): string => {
    if (!text) return '';
    let clean = text.trim();

    // 1. Try extracting from markdown code blocks first (most common)
    const codeBlockMatch = clean.match(/```(?:html)?\s*([\s\S]*?)```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
        clean = codeBlockMatch[1].trim();
    }

    // 2. Locate the start of HTML
    const startMatch = clean.search(/<!DOCTYPE\s+html|<html/i);
    if (startMatch !== -1) {
        clean = clean.substring(startMatch);
    } else {
        const divMatch = clean.search(/<div|<section|<body/i);
        if (divMatch !== -1) {
            clean = clean.substring(divMatch);
        }
    }

    // 3. Locate the end of HTML to strip trailing AI commentary
    const endMatch = clean.search(/<\/html>/i);
    if (endMatch !== -1) {
        clean = clean.substring(0, endMatch + 7);
    }
    
    if (clean.startsWith('&lt;!DOCTYPE')) {
        clean = clean.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    }

    return clean.trim();
};

const NewTechQuadrant: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(true); 
    const [selectedArticles, setSelectedArticles] = useState<ArticlePublic[]>([]);
    
    const [techList, setTechList] = useState<TechItem[]>([]);
    
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractionProgress, setExtractionProgress] = useState<ExtractionProgress | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const [resetTrigger, setResetTrigger] = useState(0);
    const [prompts, setPrompts] = useState<StratifyPrompt[]>([]);

    useEffect(() => {
        getPrompts({ scenario_id: SCENARIO_ID })
            .then(setPrompts)
            .catch(err => console.error("Failed to load scenario prompts", err));
    }, []);

    // Unified LLM Call Helper
    const callLlm = async (model: string, messages: any[], onChunk?: (text: string) => void): Promise<string> => {
        let fullText = "";
        await streamChatCompletions({
            model: model,
            messages: messages,
            stream: true,
            enable_billing: false,
            temperature: 0.1 
        }, (data) => {
            if (data.content) {
                fullText += data.content;
                if (onChunk) onChunk(data.content);
            }
        });
        return fullText;
    };

    // 获取提示词配置的模型路径
    const getModelFromPrompt = (promptName: string): string => {
        const p = prompts.find(item => item.name === promptName);
        if (p && p.channel_code && p.model_id) {
            return `${p.channel_code}@${p.model_id}`;
        }
        return FALLBACK_MODEL;
    };

    // --- Phase 1: Extraction ---
    const handleArticlesConfirmed = (articles: ArticlePublic[]) => {
        setSelectedArticles(articles);
        setIsSelectionModalOpen(false);
        performExtraction(articles);
    };

    const performExtraction = async (articles: ArticlePublic[]) => {
        setIsExtracting(true);
        setExtractionProgress({ current: 0, total: articles.length, currentTitle: '' });
        
        try {
            const promptName = '新技术识别提示词';
            const extractPrompt = prompts.find(p => p.name === promptName);
            if (!extractPrompt || !extractPrompt.content) {
                alert(`未找到'${promptName}'，请联系管理员。`);
                setIsExtracting(false);
                return;
            }

            const model = getModelFromPrompt(promptName);

            for (let i = 0; i < articles.length; i++) {
                const article = articles[i];
                setExtractionProgress({
                    current: i + 1,
                    total: articles.length,
                    currentTitle: article.title
                });

                const contentSnippet = article.content.slice(0, 3000); 
                const articleContext = `标题: ${article.title}\nURL: ${article.original_url || ''}\n发布时间: ${article.publish_date}\n\n正文:\n${contentSnippet}`;
                const fullPrompt = `${extractPrompt.content}\n\n**【待分析文章内容】**\n${articleContext}`;

                try {
                    const text = await callLlm(model, [{ role: 'user', content: fullPrompt }]);
                    const items = extractJsonArray(text);
                    
                    if (items && Array.isArray(items)) {
                        const newItems: TechItem[] = items.map((item: any) => ({
                            id: crypto.randomUUID(),
                            name: item.name || '未知技术',
                            field: item.field || '其他',
                            description: item.description || '无描述',
                            status: item.status || '未知',
                            original_url: item.original_url || article.original_url || '',
                            sourceArticleTitle: article.title,
                            isSelected: true, 
                            analysisState: 'idle'
                        }));
                        
                        setTechList(prev => [...prev, ...newItems]);
                    }
                } catch (err) {
                    console.error(`Failed to extract from article: ${article.title}`, err);
                }
            }
        } catch (e) {
            console.error("Extraction workflow error", e);
            alert("提取过程发生错误");
        } finally {
            setIsExtracting(false);
            setExtractionProgress(null);
        }
    };

    // --- Phase 2: Generation ---
    const startGeneration = async () => {
        const selectedList = techList.filter(t => t.isSelected);
        
        if (selectedList.length === 0) {
            alert("请先选择需要分析的技术点");
            return;
        }

        setTechList(selectedList);

        const itemsToProcess = selectedList.filter(t => t.analysisState !== 'done' && t.analysisState !== 'generating_html');

        if (itemsToProcess.length === 0) return;

        setIsGenerating(true);

        const reportPromptName = '新技术四象限编写';
        const htmlPromptName = '新技术四象限html生成';
        const reportPrompt = prompts.find(p => p.name === reportPromptName);
        const htmlPrompt = prompts.find(p => p.name === htmlPromptName);

        if (!reportPrompt || !htmlPrompt) {
            alert("缺少必要的提示词配置 (编写/HTML生成)");
            setIsGenerating(false);
            return;
        }

        const reportModel = getModelFromPrompt(reportPromptName);
        const htmlModel = getModelFromPrompt(htmlPromptName);

        for (const item of itemsToProcess) {
            setTechList(prev => prev.map(t => t.id === item.id ? { ...t, analysisState: 'analyzing', logs: ['开始深度分析...'] } : t));

            try {
                setTechList(prev => prev.map(t => t.id === item.id ? { ...t, logs: [...(t.logs||[]), '正在检索背景资料...'] } : t));
                
                const queryText = `${item.name} ${item.description}`;
                let retrievedInfo = "暂无详细资料。";
                let retrievedCount = 0;
                
                try {
                    const searchRes = await searchSemanticSegments({
                        query_text: queryText,
                        page: 1,
                        page_size: 5,
                        similarity_threshold: 0.35
                    });
                    if (searchRes.items && searchRes.items.length > 0) {
                        retrievedCount = searchRes.items.length;
                        retrievedInfo = searchRes.items.map((r, i) => `[资料${i+1}] ${r.title}: ${r.content}`).join('\n\n');
                    }
                } catch(e) { console.warn("RAG failed", e); }
                
                setTechList(prev => prev.map(t => t.id === item.id ? { ...t, logs: [...(t.logs||[]), `RAG 检索完成: 找到 ${retrievedCount} 条相关资料`] } : t));
                setTechList(prev => prev.map(t => t.id === item.id ? { ...t, logs: [...(t.logs||[]), 'AI 正在撰写报告...'] } : t));
                
                let filledReportPrompt = reportPrompt.content
                    .replace('{{ tech_name }}', item.name)
                    .replace('{{ tech_info }}', item.description)
                    .replace('{{ retrieved_info }}', retrievedInfo);

                let accumulatedMarkdown = "";
                const reportMd = await callLlm(
                    reportModel,
                    [{ role: 'user', content: filledReportPrompt }],
                    (chunk) => {
                        accumulatedMarkdown += chunk;
                        setTechList(prev => prev.map(t => t.id === item.id ? { ...t, markdownDetail: accumulatedMarkdown } : t));
                    }
                );
                
                if (!reportMd) throw new Error("报告生成返回空");
                
                setTechList(prev => prev.map(t => t.id === item.id ? { 
                    ...t, 
                    markdownContent: reportMd,
                    analysisState: 'generating_html',
                    logs: [...(t.logs||[]), '报告撰写完成，正在生成可视化 HTML...']
                } : t));

                const filledHtmlPrompt = htmlPrompt.content.replace('{{ markdown_content }}', reportMd);
                
                let accumulatedHtmlCode = "";
                const rawHtml = await callLlm(
                    htmlModel,
                    [{ role: 'user', content: filledHtmlPrompt }],
                    (chunk) => {
                        accumulatedHtmlCode += chunk;
                        setTechList(prev => prev.map(t => t.id === item.id ? { ...t, htmlCode: accumulatedHtmlCode } : t));
                    }
                );
                
                if (!rawHtml) throw new Error("HTML 生成返回空");
                
                const cleanHtml = extractCleanHtml(rawHtml);

                setTechList(prev => prev.map(t => t.id === item.id ? { 
                    ...t, 
                    htmlContent: cleanHtml,
                    analysisState: 'done',
                    logs: [...(t.logs||[]), '全流程完成']
                } : t));

            } catch (err: any) {
                console.error(`Error processing item ${item.name}`, err);
                setTechList(prev => prev.map(t => t.id === item.id ? { 
                    ...t, 
                    analysisState: 'error',
                    logs: [...(t.logs||[]), `错误: ${err.message}`]
                } : t));
            }
        }

        setIsGenerating(false);
    };
    
    // --- Manual Regeneration (HTML Only) ---
    const regenerateHtml = async (item: TechItem) => {
        if (!item.markdownContent) {
            alert("该项目没有分析报告内容，无法重新生成 HTML。请先进行完整分析。");
            return;
        }

        const promptName = '新技术四象限html生成';
        const htmlPrompt = prompts.find(p => p.name === promptName);
        if (!htmlPrompt) {
            alert("未找到 HTML 生成提示词");
            return;
        }

        const htmlModel = getModelFromPrompt(promptName);

        setTechList(prev => prev.map(t => t.id === item.id ? { 
            ...t, 
            analysisState: 'generating_html', 
            htmlCode: '', 
            logs: [...(t.logs||[]), '正在重新生成 HTML...'] 
        } : t));

        try {
            const filledHtmlPrompt = htmlPrompt.content.replace('{{ markdown_content }}', item.markdownContent);
            
            let accumulatedHtmlCode = "";
            const rawHtml = await callLlm(
                htmlModel,
                [{ role: 'user', content: filledHtmlPrompt }],
                (chunk) => {
                    accumulatedHtmlCode += chunk;
                    setTechList(prev => prev.map(t => t.id === item.id ? { ...t, htmlCode: accumulatedHtmlCode } : t));
                }
            );
            
            if (!rawHtml) throw new Error("HTML 生成返回空");
            
            const cleanHtml = extractCleanHtml(rawHtml);

            setTechList(prev => prev.map(t => t.id === item.id ? { 
                ...t, 
                htmlContent: cleanHtml,
                analysisState: 'done',
                logs: [...(t.logs||[]), 'HTML 重新生成完成']
            } : t));

        } catch (err: any) {
            console.error(`Error regenerating HTML for ${item.name}`, err);
            setTechList(prev => prev.map(t => t.id === item.id ? { 
                ...t, 
                analysisState: 'error',
                logs: [...(t.logs||[]), `重绘失败: ${err.message}`]
            } : t));
        }
    };


    return (
        <div className="h-full flex flex-col bg-[#f8fafc] relative">
            <AnalysisWorkspace 
                articles={selectedArticles}
                techList={techList}
                setTechList={setTechList}
                onOpenSelection={() => {
                    setIsSelectionModalOpen(true);
                }} 
                isExtracting={isExtracting}
                extractionProgress={extractionProgress}
                isGenerating={isGenerating}
                onStartGeneration={startGeneration}
                prompts={prompts}
                onRegenerateHtml={regenerateHtml}
            />

            {/* Selection Modal */}
            <div 
                className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isSelectionModalOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                style={{ display: isSelectionModalOpen ? 'flex' : 'none' }}
            >
                 <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
                      <ArticleSelectionStep 
                          onConfirm={handleArticlesConfirmed} 
                          onClose={() => setIsSelectionModalOpen(false)}
                          resetTrigger={resetTrigger}
                      />
                 </div>
            </div>
        </div>
    );
};

export default NewTechQuadrant;

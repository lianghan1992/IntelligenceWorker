
import React, { useState, useEffect } from 'react';
import { ArticleSelectionStep } from './ArticleSelectionStep';
import { AnalysisWorkspace } from './AnalysisWorkspace';
import { ArticlePublic, StratifyPrompt } from '../../../../types';
import { getPrompts } from '../../../../api/stratify';
import { chatGemini, searchSemanticSegments } from '../../../../api/intelligence';

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
    htmlContent?: string;
    logs?: string[];
}

const SCENARIO_ID = '5e99897c-6d91-4c72-88e5-653ea162e52b';

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

const NewTechQuadrant: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(true); 
    const [selectedArticles, setSelectedArticles] = useState<ArticlePublic[]>([]);
    
    const [techList, setTechList] = useState<TechItem[]>([]);
    
    const [isExtracting, setIsExtracting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const [resetTrigger, setResetTrigger] = useState(0);
    const [prompts, setPrompts] = useState<StratifyPrompt[]>([]);

    useEffect(() => {
        getPrompts({ scenario_id: SCENARIO_ID })
            .then(setPrompts)
            .catch(err => console.error("Failed to load scenario prompts", err));
    }, []);

    // --- Phase 1: Extraction ---
    // User selected articles, now we process them one by one to find new tech.
    const handleArticlesConfirmed = (articles: ArticlePublic[]) => {
        setSelectedArticles(articles);
        setIsSelectionModalOpen(false);
        performExtraction(articles);
    };

    const performExtraction = async (articles: ArticlePublic[]) => {
        setIsExtracting(true);
        try {
            const extractPrompt = prompts.find(p => p.name === '新技术识别提示词');
            if (!extractPrompt || !extractPrompt.content) {
                alert("未找到'新技术识别提示词'，请联系管理员。");
                setIsExtracting(false);
                return;
            }

            for (const article of articles) {
                const contentSnippet = article.content.slice(0, 3000); // Limit context window
                const articleContext = `标题: ${article.title}\nURL: ${article.original_url || ''}\n发布时间: ${article.publish_date}\n\n正文:\n${contentSnippet}`;
                const fullPrompt = `${extractPrompt.content}\n\n**【待分析文章内容】**\n${articleContext}`;

                try {
                    const response = await chatGemini([{ role: 'user', content: fullPrompt }], 'gemini-2.5-flash');
                    
                    if (response && response.choices && response.choices.length > 0) {
                        const text = response.choices[0].message.content;
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
                                isSelected: true, // Default selected for next step
                                analysisState: 'idle'
                            }));
                            
                            setTechList(prev => [...prev, ...newItems]);
                        }
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
        }
    };

    // --- Phase 2: Generation ---
    // User selected items from TechList, now we generate deep analysis for them sequentially.
    const startGeneration = async () => {
        // 1. Filter: Keep ONLY selected items
        const selectedList = techList.filter(t => t.isSelected);
        
        if (selectedList.length === 0) {
            alert("请先选择需要分析的技术点");
            return;
        }

        // Update state to remove unselected items immediately
        setTechList(selectedList);

        // 2. Identify items that actually need processing (skip done/processing)
        const itemsToProcess = selectedList.filter(t => t.analysisState !== 'done' && t.analysisState !== 'generating_html');

        if (itemsToProcess.length === 0) {
             // All selected are already done, nothing to do
             return;
        }

        setIsGenerating(true);

        const reportPrompt = prompts.find(p => p.name === '新技术四象限编写');
        const htmlPrompt = prompts.find(p => p.name === '新技术四象限html生成');

        if (!reportPrompt || !htmlPrompt) {
            alert("缺少必要的提示词配置 (编写/HTML生成)");
            setIsGenerating(false);
            return;
        }

        for (const item of itemsToProcess) {
            // Update UI to show analyzing
            setTechList(prev => prev.map(t => t.id === item.id ? { ...t, analysisState: 'analyzing', logs: ['开始深度分析...'] } : t));

            try {
                // --- Step 2.1: RAG Search ---
                setTechList(prev => prev.map(t => t.id === item.id ? { ...t, logs: [...(t.logs||[]), '正在检索背景资料...'] } : t));
                
                const queryText = `${item.name} ${item.description}`;
                let retrievedInfo = "暂无详细资料。";
                
                try {
                    const searchRes = await searchSemanticSegments({
                        query_text: queryText,
                        page: 1,
                        page_size: 5,
                        similarity_threshold: 0.35
                    });
                    if (searchRes.items && searchRes.items.length > 0) {
                        retrievedInfo = searchRes.items.map((r, i) => `[资料${i+1}] ${r.title}: ${r.content}`).join('\n\n');
                    }
                } catch(e) { console.warn("RAG failed", e); }

                // --- Step 2.2: Generate Markdown Report ---
                setTechList(prev => prev.map(t => t.id === item.id ? { ...t, logs: [...(t.logs||[]), 'AI 正在撰写报告...'] } : t));
                
                let filledReportPrompt = reportPrompt.content
                    .replace('{{ tech_name }}', item.name)
                    .replace('{{ tech_info }}', item.description)
                    .replace('{{ retrieved_info }}', retrievedInfo);

                // Use Pro model for better reasoning
                const reportRes = await chatGemini([{ role: 'user', content: filledReportPrompt }], 'gemini-2.5-pro');
                const reportMd = reportRes?.choices?.[0]?.message?.content;
                
                if (!reportMd) throw new Error("报告生成返回空");
                
                // Transition to review/html generation state (automatic)
                setTechList(prev => prev.map(t => t.id === item.id ? { 
                    ...t, 
                    markdownContent: reportMd,
                    analysisState: 'generating_html',
                    logs: [...(t.logs||[]), '报告撰写完成，正在生成可视化 HTML...']
                } : t));

                // --- Step 2.3: Generate HTML ---
                const filledHtmlPrompt = htmlPrompt.content.replace('{{ markdown_content }}', reportMd);
                
                const htmlRes = await chatGemini([{ role: 'user', content: filledHtmlPrompt }], 'gemini-2.5-pro');
                const rawHtml = htmlRes?.choices?.[0]?.message?.content;
                
                if (!rawHtml) throw new Error("HTML 生成返回空");
                
                // Extract clean HTML
                let cleanHtml = rawHtml;
                const match = rawHtml.match(/```html([\s\S]*?)```/);
                if (match) cleanHtml = match[1];
                else {
                     const startIdx = rawHtml.indexOf('<!DOCTYPE html>');
                     if (startIdx !== -1) cleanHtml = rawHtml.substring(startIdx);
                }

                // Finalize
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
                isGenerating={isGenerating}
                onStartGeneration={startGeneration}
                prompts={prompts}
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


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
    sourceArticleTitle?: string; 
    isSelected: boolean;
    analysisState: 'idle' | 'analyzing' | 'review' | 'generating_html' | 'done' | 'error';
    markdownContent?: string;
    htmlContent?: string;
    logs?: string[];
}

const SCENARIO_ID = '5e99897c-6d91-4c72-88e5-653ea162e52b';

const extractJsonArray = (text: string): any[] | null => {
    if (!text) return null;
    const startIndex = text.indexOf('[');
    if (startIndex === -1) return null;
    let bracketCount = 0;
    let endIndex = -1;
    let inString = false;
    let isEscaped = false;

    for (let i = startIndex; i < text.length; i++) {
        const char = text[i];
        if (isEscaped) { isEscaped = false; continue; }
        if (char === '\\') { isEscaped = true; continue; }
        if (char === '"') { inString = !inString; continue; }
        
        if (!inString) {
            if (char === '[') { bracketCount++; } 
            else if (char === ']') { 
                bracketCount--;
                if (bracketCount === 0) { endIndex = i; break; }
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
                const contentSnippet = article.content.slice(0, 3000); 
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
                                isSelected: true, 
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
        const reportPrompt = prompts.find(p => p.name === '新技术四象限编写');
        const htmlPrompt = prompts.find(p => p.name === '新技术四象限html生成');

        if (!reportPrompt || !htmlPrompt) {
            alert("缺少必要的提示词配置 (编写/HTML生成)");
            setIsGenerating(false);
            return;
        }

        for (const item of itemsToProcess) {
            setTechList(prev => prev.map(t => t.id === item.id ? { ...t, analysisState: 'analyzing', logs: ['开始深度分析...'] } : t));

            try {
                // RAG Search
                setTechList(prev => prev.map(t => t.id === item.id ? { ...t, logs: [...(t.logs||[]), '正在检索背景资料...'] } : t));
                const queryText = `${item.name} ${item.description}`;
                let retrievedInfo = "暂无详细资料。";
                let retrievedCount = 0;
                try {
                    const searchRes = await searchSemanticSegments({
                        query_text: queryText, page: 1, page_size: 5, similarity_threshold: 0.35
                    });
                    if (searchRes.items && searchRes.items.length > 0) {
                        retrievedCount = searchRes.items.length;
                        retrievedInfo = searchRes.items.map((r, i) => `[资料${i+1}] ${r.title}: ${r.content}`).join('\n\n');
                    }
                } catch(e) { console.warn("RAG failed", e); }
                setTechList(prev => prev.map(t => t.id === item.id ? { ...t, logs: [...(t.logs||[]), `RAG 检索完成: 找到 ${retrievedCount} 条相关资料`] } : t));

                // Generate Markdown
                setTechList(prev => prev.map(t => t.id === item.id ? { ...t, logs: [...(t.logs||[]), 'AI 正在撰写报告...'] } : t));
                let filledReportPrompt = reportPrompt.content
                    .replace('{{ tech_name }}', item.name)
                    .replace('{{ tech_info }}', item.description)
                    .replace('{{ retrieved_info }}', retrievedInfo);
                const reportRes = await chatGemini([{ role: 'user', content: filledReportPrompt }], 'gemini-2.5-pro');
                const reportMd = reportRes?.choices?.[0]?.message?.content;
                if (!reportMd) throw new Error("报告生成返回空");
                
                setTechList(prev => prev.map(t => t.id === item.id ? { 
                    ...t, markdownContent: reportMd, analysisState: 'generating_html', logs: [...(t.logs||[]), '报告撰写完成，正在生成可视化 HTML...']
                } : t));

                // Generate HTML
                const filledHtmlPrompt = htmlPrompt.content.replace('{{ markdown_content }}', reportMd);
                const htmlRes = await chatGemini([{ role: 'user', content: filledHtmlPrompt }], 'gemini-2.5-pro');
                const rawHtml = htmlRes?.choices?.[0]?.message?.content;
                if (!rawHtml) throw new Error("HTML 生成返回空");
                
                let cleanHtml = rawHtml;
                const match = rawHtml.match(/```html([\s\S]*?)```/);
                if (match) cleanHtml = match[1];
                else {
                     const startIdx = rawHtml.indexOf('<!DOCTYPE html>');
                     if (startIdx !== -1) cleanHtml = rawHtml.substring(startIdx);
                }

                setTechList(prev => prev.map(t => t.id === item.id ? { 
                    ...t, htmlContent: cleanHtml, analysisState: 'done', logs: [...(t.logs||[]), '全流程完成']
                } : t));

            } catch (err: any) {
                console.error(`Error processing item ${item.name}`, err);
                setTechList(prev => prev.map(t => t.id === item.id ? { 
                    ...t, analysisState: 'error', logs: [...(t.logs||[]), `错误: ${err.message}`]
                } : t));
            }
        }
        setIsGenerating(false);
    };

    // --- Redo Handler ---
    const handleRedo = async (id: string, instruction: string) => {
        const item = techList.find(t => t.id === id);
        if (!item || !item.htmlContent) throw new Error("Item not valid or no HTML found");

        const htmlPrompt = prompts.find(p => p.name === '新技术四象限html生成');
        if (!htmlPrompt) throw new Error("HTML Prompt not found");

        // UI Update: Optimistic log update
        setTechList(prev => prev.map(t => t.id === id ? { 
            ...t, 
            analysisState: 'generating_html', // Show loading state
            logs: [...(t.logs||[]), `用户请求重绘: ${instruction}`, 'AI 正在重新生成 HTML...']
        } : t));

        try {
            // Construct refinement prompt
            // We use the system prompt + user context
            const systemContent = htmlPrompt.content.replace('{{ markdown_content }}', item.markdownContent || ''); // Fallback to md context
            
            const refinementPrompt = `
You are refining an existing HTML page based on user feedback.

**Original HTML Source:**
\`\`\`html
${item.htmlContent}
\`\`\`

**User Modification Request:**
${instruction}

**Instruction:**
1. Keep the original structure and content unless asked to change.
2. Apply the user's styling or layout changes precisely.
3. Ensure the output is still a single valid HTML file (1600x900 container).
4. Output ONLY the new HTML code.
`;
            
            const messages = [
                { role: 'system', content: "You are an expert frontend developer refining HTML/Tailwind code." }, // Generic system
                { role: 'user', content: refinementPrompt }
            ];

            // Use Pro model for better code understanding
            const response = await chatGemini(messages, 'gemini-2.5-pro');
            const rawHtml = response?.choices?.[0]?.message?.content;
            
            if (!rawHtml) throw new Error("Empty response from LLM");

            let cleanHtml = rawHtml;
            const match = rawHtml.match(/```html([\s\S]*?)```/);
            if (match) cleanHtml = match[1];
            else {
                 const startIdx = rawHtml.indexOf('<!DOCTYPE html>');
                 if (startIdx !== -1) cleanHtml = rawHtml.substring(startIdx);
            }

            // Success Update
            setTechList(prev => prev.map(t => t.id === id ? { 
                ...t, 
                htmlContent: cleanHtml,
                analysisState: 'done',
                logs: [...(t.logs||[]), '重绘完成']
            } : t));

        } catch (e: any) {
            console.error("Redo failed", e);
            setTechList(prev => prev.map(t => t.id === id ? { 
                ...t, 
                analysisState: 'done', // Revert state to done (with error log)
                logs: [...(t.logs||[]), `重绘失败: ${e.message}`]
            } : t));
            throw e;
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] relative">
            <AnalysisWorkspace 
                articles={selectedArticles}
                techList={techList}
                setTechList={setTechList}
                onOpenSelection={() => setIsSelectionModalOpen(true)} 
                isExtracting={isExtracting}
                isGenerating={isGenerating}
                onStartGeneration={startGeneration}
                onRedo={handleRedo} // Pass handler
                prompts={prompts}
            />

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

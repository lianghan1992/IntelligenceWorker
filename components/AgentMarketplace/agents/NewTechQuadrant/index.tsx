
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
    // Analysis State
    analysisState: 'idle' | 'analyzing' | 'review' | 'generating_html' | 'done';
    markdownContent?: string;
    htmlContent?: string;
    logs?: string[];
}

const SCENARIO_ID = '5e99897c-6d91-4c72-88e5-653ea162e52b';

// Helper: Robustly extract JSON array from text that might contain extra markdown or text
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
    const [step, setStep] = useState<'selection' | 'workspace'>('selection');
    const [selectedArticles, setSelectedArticles] = useState<ArticlePublic[]>([]);
    const [techList, setTechList] = useState<TechItem[]>([]);
    const [isExtracting, setIsExtracting] = useState(false);
    
    // Store all prompts for this scenario
    const [prompts, setPrompts] = useState<StratifyPrompt[]>([]);

    // Pre-load prompts when component mounts
    useEffect(() => {
        getPrompts({ scenario_id: SCENARIO_ID })
            .then(setPrompts)
            .catch(err => console.error("Failed to load scenario prompts", err));
    }, []);

    const handleArticlesConfirmed = (articles: ArticlePublic[]) => {
        setSelectedArticles(articles);
        setStep('workspace');
        // Start extraction process immediately upon entering workspace
        performAnalysis(articles);
    };

    const performAnalysis = async (articles: ArticlePublic[]) => {
        setIsExtracting(true);
        setTechList([]); // Clear previous results

        try {
            // 1. Get prompt from pre-loaded state
            const targetPrompt = prompts.find(p => p.name === '新技术识别提示词');
            
            if (!targetPrompt || !targetPrompt.content) {
                console.error("Prompt '新技术识别提示词' not found in loaded prompts.");
                alert("未找到分析提示词，请联系管理员配置。");
                setIsExtracting(false);
                return;
            }

            // 2. Iterate through articles and analyze
            for (const article of articles) {
                try {
                    let contentToAnalyze = article.content;

                    // --- RAG Step: Retrieve Context ---
                    // Use title + start of content as query
                    const queryText = `${article.title} ${contentToAnalyze.slice(0, 100)}`;
                    let retrievedInfo = "暂无相关背景资料。";
                    
                    try {
                        const searchRes = await searchSemanticSegments({
                            query_text: queryText,
                            page: 1,
                            page_size: 5, // Top 5 chunks
                            similarity_threshold: 0.35
                        });
                        
                        if (searchRes.items && searchRes.items.length > 0) {
                            retrievedInfo = searchRes.items
                                .map((item, idx) => `[资料${idx+1}] ${item.title}: ${item.content.slice(0, 200)}...`)
                                .join('\n\n');
                        }
                    } catch (searchErr) {
                        console.warn("Vector search failed, proceeding without context", searchErr);
                    }
                    
                    // Replace placeholders
                    const articleContext = `标题: ${article.title}\nURL: ${article.original_url || ''}\n内容: ${contentToAnalyze}`;
                    
                    let filledPrompt = targetPrompt.content.replace('{{ article_content }}', articleContext);
                    filledPrompt = filledPrompt.replace('{{ retrieved_info }}', retrievedInfo); 

                    // Call LLM
                    const response = await chatGemini([
                        { role: 'user', content: filledPrompt }
                    ]);

                    if (response && response.choices && response.choices.length > 0) {
                        const responseText = response.choices[0].message.content;
                        
                        // Use robust extractor
                        const items = extractJsonArray(responseText);
                        
                        if (items && Array.isArray(items)) {
                            const newItems: TechItem[] = items.map((item: any) => ({
                                id: crypto.randomUUID(),
                                name: item.name || '未知技术',
                                field: item.field || '其他',
                                description: item.description || '无描述',
                                status: item.status || '未知',
                                original_url: item.original_url || article.original_url || '', 
                                analysisState: 'idle'
                            }));
                            
                            setTechList(prev => [...prev, ...newItems]);
                        } else {
                            console.warn("Failed to extract JSON array from response:", responseText);
                        }
                    }

                } catch (err) {
                    console.error(`Failed to analyze article ${article.id}`, err);
                    // Continue to next article
                }
            }

        } catch (e) {
            console.error("Analysis workflow failed", e);
            alert("分析过程中发生错误");
        } finally {
            setIsExtracting(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#f8fafc]">
            {step === 'selection' ? (
                <ArticleSelectionStep 
                    onConfirm={handleArticlesConfirmed} 
                    onBack={onBack}
                />
            ) : (
                <AnalysisWorkspace 
                    articles={selectedArticles}
                    techList={techList}
                    setTechList={setTechList}
                    onBack={() => setStep('selection')}
                    isExtracting={isExtracting}
                />
            )}
        </div>
    );
};

export default NewTechQuadrant;


import React, { useState } from 'react';
import { ArticleSelectionStep } from './ArticleSelectionStep';
import { AnalysisWorkspace } from './AnalysisWorkspace';
import { ArticlePublic } from '../../../../types';
import { getPrompts } from '../../../../api/stratify';
import { chatGemini } from '../../../../api/intelligence';
import { getArticleHtml } from '../../../../api/intelligence';

export interface TechItem {
    id: string;
    name: string;
    field: string;
    description: string;
    status: string;
    // Analysis State
    analysisState: 'idle' | 'analyzing' | 'review' | 'generating_html' | 'done';
    markdownContent?: string;
    htmlContent?: string;
    logs?: string[];
}

const NewTechQuadrant: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [step, setStep] = useState<'selection' | 'workspace'>('selection');
    const [selectedArticles, setSelectedArticles] = useState<ArticlePublic[]>([]);
    const [techList, setTechList] = useState<TechItem[]>([]);
    const [isExtracting, setIsExtracting] = useState(false);

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
            // 1. Fetch the prompt template
            const prompts = await getPrompts();
            const targetPrompt = prompts.find(p => p.name === '新技术识别提示词');
            
            if (!targetPrompt || !targetPrompt.content) {
                console.error("Prompt '新技术识别提示词' not found in backend.");
                // Fallback to a hardcoded minimal prompt or show error
                alert("未找到分析提示词，请联系管理员配置。");
                setIsExtracting(false);
                return;
            }

            // 2. Iterate through articles and analyze
            // For better UX, we could process them in parallel or batch, 
            // but sequential is safer for rate limits and debugging initially.
            for (const article of articles) {
                try {
                    // Try to get full content, fallback to summary/content in list
                    // If atomized, we might want to fetch detailed text. 
                    // Assuming 'content' field in article object is sufficient for now.
                    // If content is empty/truncated, we should fetch details.
                    
                    let contentToAnalyze = article.content;
                    if (!contentToAnalyze || contentToAnalyze.length < 100) {
                         // Attempt to fetch HTML or detail if content is missing
                         // For simplicity, we use what we have, or maybe fetch detail if needed.
                         // Let's assume ArticlePublic content is populated enough.
                    }

                    // Replace placeholders
                    // {{ article_content }} -> The article text
                    // {{ retrieved_info }} -> Optional context (empty for now)
                    
                    let filledPrompt = targetPrompt.content.replace('{{ article_content }}', `标题: ${article.title}\n内容: ${contentToAnalyze}`);
                    filledPrompt = filledPrompt.replace('{{ retrieved_info }}', ''); // No extra RAG info for now

                    // Call LLM
                    const response = await chatGemini([
                        { role: 'user', content: filledPrompt }
                    ]);

                    if (response && response.choices && response.choices.length > 0) {
                        const responseText = response.choices[0].message.content;
                        
                        // Parse JSON
                        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
                        if (jsonMatch) {
                            const jsonStr = jsonMatch[0];
                            const items = JSON.parse(jsonStr);
                            
                            if (Array.isArray(items)) {
                                const newItems: TechItem[] = items.map((item: any) => ({
                                    id: crypto.randomUUID(),
                                    name: item.name || '未知技术',
                                    field: item.field || '其他',
                                    description: item.description || '无描述',
                                    status: item.status || '未知',
                                    analysisState: 'idle'
                                }));
                                
                                setTechList(prev => [...prev, ...newItems]);
                            }
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
                />
            )}
        </div>
    );
};

export default NewTechQuadrant;


import React, { useState, useEffect } from 'react';
import { ArticleSelectionStep } from './ArticleSelectionStep';
import { AnalysisWorkspace } from './AnalysisWorkspace';
import { ArticlePublic, StratifyPrompt } from '../../../../types';
import { getPrompts } from '../../../../api/stratify';
import { chatGemini } from '../../../../api/intelligence';

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
                    
                    // Replace placeholders
                    // {{ article_content }} -> The article text + URL
                    const articleContext = `标题: ${article.title}\nURL: ${article.original_url || ''}\n内容: ${contentToAnalyze}`;
                    
                    // Note: {{ retrieved_info }} is removed from prompt template as per requirement, 
                    // so we don't need to replace it, or just replace with empty string if it still exists.
                    let filledPrompt = targetPrompt.content.replace('{{ article_content }}', articleContext);
                    filledPrompt = filledPrompt.replace('{{ retrieved_info }}', ''); 

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
                                    original_url: item.original_url || article.original_url || '', // Use returned URL or fallback to article URL
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

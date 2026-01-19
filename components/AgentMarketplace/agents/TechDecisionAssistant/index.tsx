
import React, { useState, useEffect, useCallback } from 'react';
import { AgentLayout } from '../../AgentLayout';
import { ChartIcon } from '../../../icons';
import { ChatPanel } from './ChatPanel';
import { ReportCanvas } from './ReportCanvas';
import { StepId, TechEvalSessionData, ChatMessage, ReportSection } from './types';
import { getPromptDetail, streamChatCompletions } from '../../../../api/stratify';
import { searchSemanticSegments } from '../../../../api/intelligence';
import { AGENTS } from '../../../../agentConfig';

interface TechDecisionAssistantProps {
    onBack?: () => void;
}

const DEFAULT_SECTIONS: Record<StepId, ReportSection> = {
    init: { id: 'init', title: '初始化', status: 'done', markdown: '' },
    route: { id: 'route', title: '技术路线', status: 'pending', markdown: '' },
    risk: { id: 'risk', title: '风险评估', status: 'pending', markdown: '' },
    solution: { id: 'solution', title: '解决方案', status: 'pending', markdown: '' },
    compare: { id: 'compare', title: '综合决策', status: 'pending', markdown: '' },
};

const STEPS: StepId[] = ['init', 'route', 'risk', 'solution', 'compare'];

const extractCleanHtml = (text: string) => {
    let cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    const codeBlockMatch = cleanText.match(/```html\s*([\s\S]*?)```/i);
    if (codeBlockMatch) return codeBlockMatch[1];
    
    const rawStart = cleanText.search(/<!DOCTYPE|<html|<div|<section/i);
    if (rawStart !== -1) return cleanText.substring(rawStart);
    return '';
};

const TechDecisionAssistant: React.FC<TechDecisionAssistantProps> = ({ onBack }) => {
    const [data, setData] = useState<TechEvalSessionData>({
        techName: '',
        searchQueries: [],
        currentStepIndex: 0,
        sections: JSON.parse(JSON.stringify(DEFAULT_SECTIONS)),
        messages: [{
            id: 'welcome',
            role: 'assistant',
            content: '我是您的技术决策评估助手。请告诉我您想要评估的技术名称（例如：800V碳化硅平台、半固态电池等）。',
            timestamp: Date.now()
        }]
    });
    
    const [isGenerating, setIsGenerating] = useState(false);

    const currentStepId = STEPS[data.currentStepIndex];
    const currentSection = data.sections[currentStepId];

    // Helper: Add Message
    const addMessage = (role: 'user' | 'assistant', content: string) => {
        const msg: ChatMessage = { id: crypto.randomUUID(), role, content, timestamp: Date.now() };
        setData(prev => ({ ...prev, messages: [...prev.messages, msg] }));
    };

    // Helper: Update Section
    const updateSection = (stepId: StepId, updates: Partial<ReportSection>) => {
        setData(prev => ({
            ...prev,
            sections: {
                ...prev.sections,
                [stepId]: { ...prev.sections[stepId], ...updates }
            }
        }));
    };

    // --- STEP 0: Initialization ---
    const runInitStep = async (input: string) => {
        setIsGenerating(true);
        updateSection('init', { status: 'generating' });
        
        try {
            const prompt = await getPromptDetail('tech_eval_init');
            const filledPrompt = prompt.content.replace('{{ user_input }}', input);

            let jsonBuffer = "";
            await streamChatCompletions({
                model: 'zhipu@glm-4-flash',
                messages: [{ role: 'user', content: filledPrompt }],
                stream: true,
                temperature: 0.1
            }, (chunk) => {
                if (chunk.content) jsonBuffer += chunk.content;
            });

            // Parse JSON
            let parsed;
            try {
                // Try to find JSON block
                const match = jsonBuffer.match(/```json([\s\S]*?)```/) || jsonBuffer.match(/\{[\s\S]*\}/);
                const cleanJson = match ? match[0].replace(/```json/g, '').replace(/```/g, '') : jsonBuffer;
                parsed = JSON.parse(cleanJson);
            } catch (e) {
                console.error("JSON Parse Error", e);
                // Fallback if simple extraction failed
                parsed = { tech_name: input, search_queries: [input] };
            }

            setData(prev => ({
                ...prev,
                techName: parsed.tech_name,
                techDefinition: parsed.definition,
                searchQueries: parsed.search_queries || [parsed.tech_name],
                currentStepIndex: 1, // Move to next step immediately
            }));
            
            addMessage('assistant', `已确认评估对象：**${parsed.tech_name}**。\n初步定义：${parsed.definition}\n\n正在启动第一阶段分析：技术路线与竞品锚定...`);
            
            // Auto trigger next step
            setTimeout(() => runGenerationStep('route', parsed.tech_name, parsed.search_queries), 500);

        } catch (e: any) {
            addMessage('assistant', `初始化失败: ${e.message}`);
        } finally {
            setIsGenerating(false);
            updateSection('init', { status: 'done' });
        }
    };

    // --- GENERIC GENERATION STEP ---
    const runGenerationStep = async (stepId: StepId, techName: string, queries: string[], userInstructions?: string) => {
        setIsGenerating(true);
        updateSection(stepId, { status: 'generating', markdown: '' });
        
        try {
            // 1. RAG Search (Simulated or Real)
            let ragContext = "";
            if (!userInstructions) { // Only search on first run of the step, or always? Let's search always for now to be robust.
                const queryStr = queries.join(' ') + ` ${stepId} 技术评估`;
                const searchRes = await searchSemanticSegments({ 
                    query_text: queryStr, 
                    page: 1, 
                    page_size: 5,
                    similarity_threshold: 0.3
                });
                if (searchRes.items && searchRes.items.length > 0) {
                    ragContext = searchRes.items.map((it, idx) => `[资料${idx+1}] ${it.title}: ${it.content}`).join('\n\n');
                }
            }

            // 2. Fetch Prompt
            const promptMap: Record<StepId, string> = {
                'init': 'tech_eval_init',
                'route': 'tech_eval_step1_route',
                'risk': 'tech_eval_step2_risk',
                'solution': 'tech_eval_step3_solution',
                'compare': 'tech_eval_step4_compare'
            };
            
            const promptName = promptMap[stepId];
            const promptTemplate = await getPromptDetail(promptName);
            
            // 3. Context Preparation
            // Gather previous summaries if needed
            const prevSummary = stepId === 'risk' ? data.sections['route'].markdown.slice(0, 500) :
                                stepId === 'solution' ? data.sections['risk'].markdown.slice(0, 500) :
                                stepId === 'compare' ? (data.sections['route'].markdown + data.sections['risk'].markdown + data.sections['solution'].markdown).slice(0, 1000) : '';

            let filledPrompt = promptTemplate.content
                .replace(/{{ tech_name }}/g, techName)
                .replace(/{{ retrieved_info }}/g, ragContext || '暂无更多外部资料，请基于您的专业知识分析。')
                .replace(/{{ step1_summary }}/g, prevSummary) // for risk
                .replace(/{{ step2_summary }}/g, prevSummary) // for solution
                .replace(/{{ steps_summary }}/g, prevSummary); // for compare
            
            if (userInstructions) {
                filledPrompt += `\n\n**用户补充指令（请重点关注并修改）：**\n${userInstructions}`;
            }

            // 4. Stream LLM
            let fullContent = "";
            await streamChatCompletions({
                model: 'zhipu@glm-4-flash',
                messages: [{ role: 'user', content: filledPrompt }],
                stream: true,
                temperature: 0.2
            }, (chunk) => {
                if (chunk.content) {
                    fullContent += chunk.content;
                    // Real-time update markdown (HTML extraction happens in render or post-process)
                    // We strip the HTML block from markdown display if needed, but for now lets keep it raw or process it
                    // Actually, ReportCanvas handles HTML extraction for the widget? 
                    // Let's separate HTML here for cleaner storage
                    const cleanHtml = extractCleanHtml(fullContent);
                    // Remove HTML code block from markdown to avoid duplication in text view
                    // const cleanMarkdown = fullContent.replace(/```html[\s\S]*?```/gi, '').replace(/<html>[\s\S]*?<\/html>/gi, '');
                    
                    updateSection(stepId, { 
                        markdown: fullContent, 
                        html: cleanHtml 
                    });
                }
            }, undefined, undefined, AGENTS.TECH_DECISION_ASSISTANT); // Pass Agent ID for billing

            updateSection(stepId, { status: 'review' });
            addMessage('assistant', `**${data.sections[stepId].title}** 草稿已生成。请查阅左侧报告。如有修改意见请直接输入，或点击“确认”进入下一阶段。`);

        } catch (e: any) {
            console.error(e);
            addMessage('assistant', `生成失败: ${e.message}`);
            updateSection(stepId, { status: 'pending' }); // Reset to allow retry
        } finally {
            setIsGenerating(false);
        }
    };

    // --- Handlers ---
    const handleSendMessage = (text: string) => {
        addMessage('user', text);
        
        if (currentStepId === 'init') {
            runInitStep(text);
        } else if (currentSection.status === 'review') {
            // User wants to modify the current step
            runGenerationStep(currentStepId, data.techName, data.searchQueries, text);
        } else {
            // General chat or instructions while generating?
            // If generating, input is disabled.
        }
    };

    const handleConfirmStep = () => {
        updateSection(currentStepId, { status: 'done' });
        
        if (data.currentStepIndex < STEPS.length - 1) {
            const nextIndex = data.currentStepIndex + 1;
            const nextStepId = STEPS[nextIndex];
            
            setData(prev => ({ ...prev, currentStepIndex: nextIndex }));
            addMessage('assistant', `阶段确认。正在启动下一阶段：**${data.sections[nextStepId].title}**...`);
            
            // Auto start next step
            setTimeout(() => {
                runGenerationStep(nextStepId, data.techName, data.searchQueries);
            }, 500);
        } else {
            addMessage('assistant', `🎉 恭喜！全流程评估已完成。您可以导出报告或继续与我对话完善细节。`);
        }
    };

    const handleRegenerateStep = () => {
        runGenerationStep(currentStepId, data.techName, data.searchQueries, "请重新生成本节内容，尝试不同的分析角度。");
    };

    return (
        <AgentLayout 
            title="技术决策评估助手" 
            icon={ChartIcon} 
            onBack={onBack || (() => window.history.back())}
        >
            <div className="flex h-full overflow-hidden">
                {/* Left Canvas (60%) */}
                <div className="flex-1 min-w-0 border-r border-slate-200">
                    <ReportCanvas 
                        sections={data.sections}
                        currentStep={currentStepId}
                        techName={data.techName}
                    />
                </div>

                {/* Right Chat (40%) */}
                <div className="w-[450px] flex-shrink-0 bg-white shadow-xl z-10">
                    <ChatPanel 
                        messages={data.messages}
                        onSendMessage={handleSendMessage}
                        isGenerating={isGenerating}
                        currentStep={currentStepId}
                        stepStatus={currentSection.status}
                        onConfirmStep={handleConfirmStep}
                        onRegenerateStep={handleRegenerateStep}
                    />
                </div>
            </div>
        </AgentLayout>
    );
};

export default TechDecisionAssistant;

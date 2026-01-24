
import React, { useState } from 'react';
import { PPTStage, PPTData, PPTPageData, SharedGeneratorProps } from './types';
import VisualEditor from '../shared/VisualEditor';
import { 
    DocumentTextIcon, SparklesIcon, RefreshIcon, ChevronLeftIcon, 
    ChevronRightIcon, CheckCircleIcon, PlayIcon, StopIcon
} from '../icons';

interface MainCanvasProps extends SharedGeneratorProps {
    stage: PPTStage;
    data: PPTData;
    activePageIndex: number;
    setActivePageIndex: (index: number) => void;
    isLlmActive: boolean;
    setStage: (stage: PPTStage) => void;
    setData: React.Dispatch<React.SetStateAction<PPTData>>;
}

const Spinner = () => <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>;

export const MainCanvas: React.FC<MainCanvasProps> = ({ 
    stage, data, activePageIndex, setActivePageIndex, isLlmActive, setStage, setData
}) => {
    // Local state for scaling, just for display
    const [scale, setScale] = useState(0.8);
    const [viewMode, setViewMode] = useState<'edit' | 'grid'>('edit');

    const currentPage = data.pages[activePageIndex];

    const handleContentUpdate = (newHtml: string) => {
        setData(prev => {
            const newPages = [...prev.pages];
            newPages[activePageIndex] = { ...newPages[activePageIndex], html: newHtml };
            return { ...prev, pages: newPages };
        });
    };

    if (stage === 'collect' || stage === 'outline') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50 opacity-60">
                <DocumentTextIcon className="w-16 h-16 mb-4 text-slate-300" />
                <p>请在左侧侧边栏完成大纲规划</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#f1f5f9] overflow-hidden">
            {/* Toolbar */}
            <div className="h-14 px-6 border-b border-slate-200 bg-white flex justify-between items-center shadow-sm shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-slate-700 text-sm truncate max-w-xs">{currentPage?.title || '无标题页面'}</span>
                    <div className="h-4 w-px bg-slate-300"></div>
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setViewMode('edit')}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'edit' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            编辑模式
                        </button>
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            网格预览
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setStage('finalize')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-md transition-all active:scale-95 flex items-center gap-2"
                    >
                        <CheckCircleIcon className="w-4 h-4" /> 完成并导出
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
                {viewMode === 'edit' && currentPage ? (
                    <div className="w-full h-full flex items-center justify-center p-8">
                         {currentPage.html ? (
                             <div className="shadow-2xl rounded-sm overflow-hidden ring-1 ring-black/5" style={{ width: '100%', height: '100%', maxWidth: 1200, maxHeight: 675 }}>
                                <VisualEditor 
                                    initialHtml={currentPage.html} 
                                    onSave={handleContentUpdate} 
                                    scale={scale} 
                                    onScaleChange={setScale}
                                    canvasSize={{ width: 1600, height: 900 }}
                                />
                             </div>
                         ) : (
                             <div className="flex flex-col items-center justify-center text-slate-400 gap-4">
                                 {currentPage.isGenerating ? (
                                     <>
                                         <RefreshIcon className="w-12 h-12 animate-spin text-indigo-300" />
                                         <p className="text-sm font-medium text-indigo-500">AI 正在生成页面内容...</p>
                                     </>
                                 ) : (
                                     <>
                                         <SparklesIcon className="w-12 h-12 text-slate-300" />
                                         <p className="text-sm">内容尚未生成，请在左侧点击“生成本页”</p>
                                     </>
                                 )}
                             </div>
                         )}
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="p-8 overflow-y-auto custom-scrollbar h-full">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {data.pages.map((page, idx) => (
                                <div 
                                    key={idx}
                                    onClick={() => { setActivePageIndex(idx); setViewMode('edit'); }}
                                    className={`
                                        aspect-video bg-white rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg relative overflow-hidden group
                                        ${activePageIndex === idx ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-indigo-300'}
                                    `}
                                >
                                    {page.html ? (
                                        <div className="w-full h-full relative pointer-events-none">
                                            <iframe srcDoc={page.html} className="w-[1600px] h-[900px] transform scale-[0.2] origin-top-left" tabIndex={-1} />
                                        </div>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300">
                                            {page.isGenerating ? <RefreshIcon className="w-6 h-6 animate-spin"/> : <DocumentTextIcon className="w-8 h-8"/>}
                                        </div>
                                    )}
                                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur rounded text-white text-[10px] font-bold">
                                        {idx + 1}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Bottom Bar (Filmstrip) - Optional if in Edit Mode */}
            {viewMode === 'edit' && (
                <div className="h-24 bg-white border-t border-slate-200 flex items-center px-4 gap-3 overflow-x-auto custom-scrollbar shrink-0">
                    {data.pages.map((page, idx) => (
                        <div 
                            key={idx}
                            onClick={() => setActivePageIndex(idx)}
                            className={`
                                flex-shrink-0 w-32 aspect-video rounded border cursor-pointer transition-all relative overflow-hidden
                                ${activePageIndex === idx ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 opacity-60 hover:opacity-100'}
                            `}
                        >
                            {page.html ? (
                                <div className="w-full h-full relative pointer-events-none bg-white">
                                    <iframe srcDoc={page.html} className="w-[1600px] h-[900px] transform scale-[0.08] origin-top-left" tabIndex={-1} />
                                </div>
                            ) : (
                                <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                                    {page.isGenerating && <RefreshIcon className="w-4 h-4 animate-spin text-indigo-400"/>}
                                </div>
                            )}
                            <div className="absolute bottom-0.5 left-0.5 px-1 bg-black/50 text-white text-[8px] rounded">
                                {idx + 1}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

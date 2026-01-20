
import React, { useState } from 'react';
import { HtmlDesign } from './HtmlDesign';
import { SearchPreview } from './SearchPreview';
import { PuzzleIcon, GlobeIcon, CodeIcon } from '../../icons';

type PreviewSubView = 'html_editor' | 'search_service';

export const ComponentPreviewManager: React.FC = () => {
    const [subView, setSubView] = useState<PreviewSubView>('html_editor');

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* 子导航栏 */}
            <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 pt-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-md">
                        <PuzzleIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">组件与服务预览</h1>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium uppercase tracking-widest">Component & Service Playground</p>
                    </div>
                </div>

                <div className="flex gap-8 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setSubView('html_editor')}
                        className={`pb-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-all ${
                            subView === 'html_editor' 
                                ? 'border-indigo-600 text-indigo-600' 
                                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                        }`}
                    >
                        <CodeIcon className="w-5 h-5" />
                        可视化 HTML 设计器
                    </button>
                    <button
                        onClick={() => setSubView('search_service')}
                        className={`pb-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-all ${
                            subView === 'search_service' 
                                ? 'border-indigo-600 text-indigo-600' 
                                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                        }`}
                    >
                        <GlobeIcon className="w-5 h-5" />
                        通用搜索服务
                    </button>
                </div>
            </div>

            {/* 内容区 */}
            <div className="flex-1 overflow-hidden relative">
                {subView === 'html_editor' ? <HtmlDesign /> : <SearchPreview />}
            </div>
        </div>
    );
};

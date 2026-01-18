
import React, { useState } from 'react';
import VisualEditor from '../../shared/VisualEditor';
import { CodeIcon, EyeIcon, ViewGridIcon, CubeIcon, PlayIcon, CloseIcon } from '../../icons';
import { Button } from '../../shared/Button';
import { Spinner } from '../../shared/Spinner';
import { StatusBadge } from '../../shared/StatusBadge';
import { Modal } from '../../shared/Modal';

const SAMPLE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 flex items-center justify-center h-screen m-0 p-0 overflow-hidden">
  <div id="canvas" class="w-[1600px] h-[900px] bg-white relative overflow-hidden shadow-xl flex flex-col border-[12px] border-white box-border">
    <!-- Header -->
    <header class="h-[80px] px-10 flex items-center border-b border-gray-100 bg-white z-10 justify-between">
      <div class="flex items-center gap-4">
        <div class="w-1.5 h-8 bg-blue-600 rounded-full"></div>
        <h1 class="text-3xl font-bold text-gray-900 tracking-tight">Q3 季度核心业务增长分析</h1>
      </div>
      <div class="flex items-center gap-3">
        <span class="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-bold border border-blue-100">CONFIDENTIAL</span>
        <span class="text-gray-400 font-mono text-sm">2023-10-24</span>
      </div>
    </header>
    <main class="flex-1 p-10 grid grid-cols-3 gap-8 bg-slate-50">
      <div class="col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col relative group overflow-hidden">
        <div class="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[100px] -mr-4 -mt-4 transition-all group-hover:scale-110"></div>
        <div class="flex items-center gap-3 mb-6 relative z-10">
           <div class="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">A</div>
           <h2 class="text-2xl font-bold text-slate-800">用户增长引擎</h2>
        </div>
        <p class="mt-6 text-slate-500 text-sm leading-relaxed">
            通过优化新用户引导流程 (Onboarding) 及精准的 AI 推荐策略，本季度实现了用户留存率的显著提升。
        </p>
      </div>
    </main>
  </div>
</body>
</html>`;

const SharedComponentsPreview: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="p-8 space-y-12 max-w-6xl mx-auto">
            {/* Buttons Section */}
            <section className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">Button 组件</h3>
                <div className="flex flex-wrap gap-4 items-center">
                    <Button>Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="danger">Danger</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button disabled>Disabled</Button>
                    <Button isLoading>Loading</Button>
                    <Button icon={<PlayIcon className="w-4 h-4"/>}>With Icon</Button>
                    <Button size="xs">XS</Button>
                    <Button size="sm">Small</Button>
                    <Button size="lg">Large</Button>
                </div>
            </section>

            {/* Badges Section */}
            <section className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">StatusBadge 组件</h3>
                <div className="flex flex-wrap gap-4">
                    <StatusBadge status="completed" />
                    <StatusBadge status="processing" />
                    <StatusBadge status="pending" />
                    <StatusBadge status="failed" />
                    <StatusBadge status="stopped" />
                    <StatusBadge status="custom" text="自定义状态" icon={false} />
                </div>
            </section>

            {/* Spinner Section */}
            <section className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">Spinner 组件</h3>
                <div className="flex items-center gap-8 bg-white p-4 rounded-lg border border-slate-200">
                    <div className="text-center space-y-2">
                        <Spinner size="sm" />
                        <p className="text-xs text-slate-400">Small</p>
                    </div>
                    <div className="text-center space-y-2">
                        <Spinner size="md" color="text-indigo-600" />
                        <p className="text-xs text-slate-400">Medium (Colored)</p>
                    </div>
                    <div className="text-center space-y-2">
                        <Spinner size="lg" color="text-red-500" />
                        <p className="text-xs text-slate-400">Large</p>
                    </div>
                </div>
            </section>

            {/* Modal Section */}
            <section className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">Modal 组件</h3>
                <Button onClick={() => setIsModalOpen(true)}>打开演示弹窗</Button>
                
                <Modal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)}
                    title="演示弹窗标题"
                    footer={
                        <div className="flex justify-end gap-2 w-full">
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>取消</Button>
                            <Button onClick={() => setIsModalOpen(false)}>确定</Button>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        <p className="text-slate-600">这是一个标准的 Modal 组件示例。</p>
                        <div className="p-4 bg-slate-50 rounded border border-slate-100">
                            <h4 className="font-bold text-sm mb-2">内容区域</h4>
                            <p className="text-xs text-slate-500">支持任意 React Node 作为内容。</p>
                        </div>
                    </div>
                </Modal>
            </section>
        </div>
    );
};

export const HtmlDesign: React.FC = () => {
    const [tab, setTab] = useState<'editor' | 'library'>('editor');
    const [html, setHtml] = useState(SAMPLE_HTML);
    const [mode, setMode] = useState<'editor' | 'preview'>('editor');

    return (
        <div className="h-full flex flex-col bg-slate-100">
            {/* Top Tabs */}
            <div className="bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 h-14">
                <div className="flex gap-6">
                    <button 
                        onClick={() => setTab('editor')}
                        className={`text-sm font-bold flex items-center gap-2 h-14 border-b-2 transition-all ${
                            tab === 'editor' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <CodeIcon className="w-4 h-4"/> HTML 可视化设计
                    </button>
                    <button 
                        onClick={() => setTab('library')}
                        className={`text-sm font-bold flex items-center gap-2 h-14 border-b-2 transition-all ${
                            tab === 'library' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <CubeIcon className="w-4 h-4"/> 公共组件库
                    </button>
                </div>

                {tab === 'editor' && (
                    <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setMode('editor')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${mode === 'editor' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <EyeIcon className="w-3.5 h-3.5"/> 可视化
                        </button>
                        <button 
                            onClick={() => setMode('preview')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${mode === 'preview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <CodeIcon className="w-3.5 h-3.5"/> 源码
                        </button>
                    </div>
                )}
            </div>

            {/* Workspace */}
            <div className="flex-1 overflow-hidden relative">
                {tab === 'editor' ? (
                    mode === 'editor' ? (
                        <VisualEditor 
                            initialHtml={html}
                            onSave={setHtml}
                            scale={0.7} 
                        />
                    ) : (
                        <div className="h-full w-full bg-[#1e1e1e] p-6 overflow-auto custom-scrollbar-dark">
                            <textarea 
                                value={html}
                                onChange={(e) => setHtml(e.target.value)}
                                className="w-full h-full bg-transparent text-slate-300 font-mono text-sm outline-none resize-none"
                                spellCheck={false}
                            />
                        </div>
                    )
                ) : (
                    <div className="h-full overflow-y-auto custom-scrollbar">
                        <SharedComponentsPreview />
                    </div>
                )}
            </div>
        </div>
    );
};

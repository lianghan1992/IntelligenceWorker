
import React, { useState, useRef } from 'react';
import { ArrowRightIcon, DocumentTextIcon } from '../../icons';

// Simple Upload Icon component since it might not be in the shared icons yet
const FileUploadIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M12 18v-6" />
        <path d="M9 15l3-3 3 3" />
    </svg>
);

export const IdeaInput: React.FC<{ 
    onStart: (idea: string) => void, 
    isLoading: boolean, 
}> = ({ onStart, isLoading }) => {
    const [idea, setIdea] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handlePasteClick = () => {
        if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.placeholder = "请在此处粘贴您的大纲或PPT内容...";
        }
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[600px] bg-[#f2f4f7] px-4 font-sans">
            <div className="w-full max-w-[1000px] flex flex-col gap-8">
                {/* Header Section */}
                <div className="text-center space-y-4">
                    <h1 className="text-5xl font-black text-slate-900 tracking-tight">
                        从一个想法开始
                    </h1>
                    <p className="text-lg text-slate-500 font-medium">
                        描述您报告的核心概念，让我们的AI为您构建基础。
                    </p>
                    
                    <div className="flex flex-col items-center gap-1 mt-4">
                        <p className="text-xs text-gray-400">
                            支持上传用户私有数据，使报告内容更聚焦，支持格式为: TXT, MD, PDF, DOCX
                        </p>
                        <button 
                            onClick={handlePasteClick}
                            className="text-blue-600 font-bold text-sm hover:underline hover:text-blue-700 transition-colors"
                        >
                            如您已有大纲或完整PPT每页内容，请直接粘贴，AI将自动为您解析
                        </button>
                    </div>
                </div>

                {/* Input Area */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-2 transition-all duration-300 focus-within:ring-4 focus-within:ring-blue-50 focus-within:border-blue-200">
                    <textarea
                        ref={textareaRef}
                        value={idea}
                        onChange={(e) => setIdea(e.target.value)}
                        placeholder="例如，“从一位智能汽车行业研究专家的角度编写一份10页左右关于端到端自动驾驶技术未来3-5年的技术路线报告，汇报对象为集团高层和技术专家”"
                        className="w-full h-64 p-6 text-lg bg-transparent border-none resize-none focus:ring-0 focus:outline-none text-slate-800 placeholder:text-slate-300 leading-relaxed rounded-2xl"
                        disabled={isLoading}
                    />
                </div>

                {/* Bottom Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-2">
                    {/* File Upload Button */}
                    <div>
                        <input
                            type="file"
                            multiple
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".txt,.md,.pdf,.docx"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading}
                            className="flex items-center gap-3 px-6 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm group"
                        >
                            {files.length > 0 ? (
                                <>
                                    <div className="w-5 h-5 flex items-center justify-center bg-blue-100 text-blue-600 rounded">
                                        <DocumentTextIcon className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-blue-600">已选择 {files.length} 个文件</span>
                                </>
                            ) : (
                                <>
                                    <FileUploadIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                                    <span>上传辅助文件 (可选)</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={() => onStart(idea)}
                        disabled={!idea.trim() || isLoading}
                        className="w-full sm:w-auto px-12 py-3.5 bg-[#1d4ed8] text-white text-base font-bold rounded-2xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:shadow-blue-600/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>生成中...</span>
                            </>
                        ) : (
                            <>
                                <span>生成</span>
                                <ArrowRightIcon className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

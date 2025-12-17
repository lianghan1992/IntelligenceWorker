
import React, { useState, useRef, useEffect } from 'react';
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

const ParticleFlow = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        let width = window.innerWidth;
        let height = window.innerHeight;

        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };
        window.addEventListener('resize', resize);
        resize();

        class Particle {
            x: number;
            y: number;
            size: number;
            speedX: number;
            speedY: number;
            color: string;
            alpha: number;

            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.size = Math.random() * 2 + 0.5;
                this.speedX = Math.random() * 0.5 - 0.25;
                this.speedY = Math.random() * 0.5 - 0.25;
                this.alpha = Math.random() * 0.5 + 0.1;
                const colors = ['148, 163, 184', '99, 102, 241', '59, 130, 246']; // Slate-400, Indigo-500, Blue-500
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }

            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                
                // Wrap around screen
                if (this.x < 0) this.x = width;
                if (this.x > width) this.x = 0;
                if (this.y < 0) this.y = height;
                if (this.y > height) this.y = 0;
            }

            draw() {
                if (!ctx) return;
                ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const init = () => {
            particles = [];
            for (let i = 0; i < 80; i++) {
                particles.push(new Particle());
            }
        };
        init();

        const animate = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, width, height);
            
            // Draw connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < 120) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(99, 102, 241, ${0.05 * (1 - distance / 120)})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }

            particles.forEach(p => {
                p.update();
                p.draw();
            });
            animationFrameId = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none opacity-50" />;
};

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
        <div className="flex-1 flex flex-col items-center justify-start pt-20 md:pt-32 min-h-screen bg-[#f2f4f7] px-4 font-sans relative overflow-hidden">
            
            <ParticleFlow />

            <div className="w-full max-w-[1000px] flex flex-col gap-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
                <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-sm border border-slate-200 p-2 transition-all duration-300 focus-within:ring-4 focus-within:ring-blue-50 focus-within:border-blue-200">
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

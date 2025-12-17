
import React, { useEffect, useRef } from 'react';
import { ArrowRightIcon, SparklesIcon, PuzzleIcon } from '../icons';

interface ToolsIntroProps {
    type: 'copilot' | 'vector';
    onClose: () => void;
}

export const ToolsIntro: React.FC<ToolsIntroProps> = ({ type, onClose }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Animation Config
    const config = type === 'copilot' ? {
        title: "AI 智能分析助手",
        subtitle: "INTELLIGENT ANALYSIS AGENT",
        desc: "这不是简单的搜索，而是为您打造的情报加工厂。AI 将以上帝视角审视海量资讯，精准捕获高关联情报，并一键生成结构化综述。",
        accent: '#4f46e5', // Indigo-600
        secondary: '#a855f7', // Purple-500
        icon: SparklesIcon
    } : {
        title: "高维向量检索",
        subtitle: "HIGH-DIMENSIONAL VECTOR SEARCH",
        desc: "打破文章壁垒，直接穿透至知识的最小原子。通过高维向量技术，毫秒级定位您急需的关键片段，为每一次决策提供精准的事实支撑。",
        accent: '#10b981', // Emerald-500
        secondary: '#06b6d4', // Cyan-500
        icon: PuzzleIcon
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        let particles: Particle[] = [];
        let animationFrameId: number;
        
        // Setup Canvas
        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };
        window.addEventListener('resize', resize);
        resize();

        // Particle Class
        class Particle {
            x: number;
            y: number;
            z: number; // Depth
            size: number;
            speed: number;
            angle: number;
            color: string;
            state: 'orbit' | 'converge' | 'emit';
            targetX: number;
            targetY: number;

            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.z = Math.random() * 2 + 0.5;
                this.size = Math.random() * 2 + 0.5;
                this.speed = Math.random() * 1 + 0.5;
                this.angle = Math.random() * Math.PI * 2;
                this.color = Math.random() > 0.5 ? config.accent : config.secondary;
                this.state = 'orbit';
                this.targetX = width / 2;
                this.targetY = height / 2;
            }

            update() {
                const centerX = width / 2;
                const centerY = height / 2;

                if (this.state === 'orbit') {
                    // Gentle float
                    this.x += Math.cos(this.angle) * this.speed * 0.5;
                    this.y += Math.sin(this.angle) * this.speed * 0.5;
                    this.angle += 0.01;

                    // Converge occasionally
                    if (Math.random() < 0.005) this.state = 'converge';
                    
                    // Wrap around
                    if (this.x < 0) this.x = width;
                    if (this.x > width) this.x = 0;
                    if (this.y < 0) this.y = height;
                    if (this.y > height) this.y = 0;

                } else if (this.state === 'converge') {
                    // Fly to center
                    const dx = centerX - this.x;
                    const dy = centerY - this.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    
                    if (dist < 20) {
                        this.state = 'emit';
                        this.angle = Math.random() * Math.PI * 2;
                        this.speed = Math.random() * 5 + 5; // Fast burst
                    } else {
                        this.x += (dx / dist) * this.speed * 4;
                        this.y += (dy / dist) * this.speed * 4;
                    }

                } else if (this.state === 'emit') {
                    // Burst out
                    this.x += Math.cos(this.angle) * this.speed;
                    this.y += Math.sin(this.angle) * this.speed;
                    this.speed *= 0.95; // Drag
                    
                    if (this.speed < 0.5 || this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
                        // Reset
                        this.state = 'orbit';
                        this.x = Math.random() * width;
                        this.y = Math.random() * height;
                        this.speed = Math.random() * 1 + 0.5;
                    }
                }
            }

            draw() {
                if (!ctx) return;
                const alpha = this.state === 'emit' ? (this.speed / 5) : (this.state === 'converge' ? 0.8 : 0.4);
                ctx.globalAlpha = alpha;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * this.z, 0, Math.PI * 2);
                ctx.fill();
                
                // Trail for converging/emitting
                if (this.state !== 'orbit') {
                    ctx.strokeStyle = this.color;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y);
                    const tailLen = this.state === 'converge' ? 10 : 20;
                    ctx.lineTo(this.x - Math.cos(this.angle) * tailLen, this.y - Math.sin(this.angle) * tailLen);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            }
        }

        // Init Particles
        const particleCount = window.innerWidth < 768 ? 60 : 150;
        for(let i=0; i<particleCount; i++) {
            particles.push(new Particle());
        }

        // Main Loop
        const animate = () => {
            ctx.fillStyle = '#0f172a'; // Slate-900 background
            ctx.fillRect(0, 0, width, height);

            // Draw Core
            const centerX = width / 2;
            const centerY = height / 2;
            
            // Core Glow
            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 200);
            gradient.addColorStop(0, `${config.accent}40`); // Hex + opacity
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 200, 0, Math.PI * 2);
            ctx.fill();

            // Core Ring (Rotating)
            const time = Date.now() / 1000;
            ctx.strokeStyle = `${config.accent}80`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, 60, 20, time, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.strokeStyle = `${config.secondary}80`;
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, 60, 20, -time, 0, Math.PI * 2);
            ctx.stroke();

            // Update & Draw Particles
            particles.forEach(p => {
                p.update();
                p.draw();
            });

            // Draw Scanning Grid (Subtle)
            if (width > 768) {
                ctx.strokeStyle = '#1e293b';
                ctx.lineWidth = 1;
                const scanY = (Date.now() / 20) % height;
                ctx.beginPath();
                ctx.moveTo(0, scanY);
                ctx.lineTo(width, scanY);
                ctx.stroke();
            }

            animationFrameId = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [config, type]);

    return (
        <div ref={containerRef} className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden font-sans text-white">
            {/* Canvas Background */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
            
            {/* Content Overlay */}
            <div className="relative z-10 p-8 max-w-2xl text-center flex flex-col items-center animate-in fade-in zoom-in duration-700">
                {/* Icon Ring */}
                <div className="w-24 h-24 mb-8 relative flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping opacity-20"></div>
                    <div className="absolute inset-2 rounded-full border border-white/40"></div>
                    <div className="w-full h-full rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                        <config.icon className="w-10 h-10 text-white" />
                    </div>
                </div>

                <h3 className="text-xs md:text-sm font-bold tracking-[0.3em] text-white/50 mb-4">{config.subtitle}</h3>
                
                <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight drop-shadow-2xl">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/70">
                        {config.title}
                    </span>
                </h1>
                
                <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-lg mb-12 font-light">
                    {config.desc}
                </p>

                <button 
                    onClick={onClose}
                    className="group relative px-8 py-4 bg-white text-slate-900 rounded-full font-bold text-lg overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] active:scale-95"
                >
                    <span className="relative z-10 flex items-center gap-2">
                        即刻开启 <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                </button>
            </div>

            {/* Decor Elements */}
            <div className="absolute bottom-10 left-0 w-full text-center text-[10px] text-white/20 tracking-widest uppercase">
                System Initialized • Ready for Analysis
            </div>
        </div>
    );
};

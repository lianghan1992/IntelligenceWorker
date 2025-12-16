
import React from 'react';

export const MarkdownStyles = () => (
    <style>{`
        .prose table { width: 100%; border-collapse: collapse; margin: 1.5em 0; font-size: 0.875em; }
        .prose th { background-color: #f8fafc; font-weight: 700; text-align: left; padding: 0.75rem; border: 1px solid #e2e8f0; color: #1e293b; }
        .prose td { padding: 0.75rem; border: 1px solid #e2e8f0; color: #475569; }
        .prose tr:nth-child(even) { background-color: #fcfcfc; }
        .prose blockquote { border-left: 4px solid #6366f1; background-color: #f5f3ff; padding: 1rem; border-radius: 0.5rem; color: #4f46e5; }
        .typing-cursor::after { content: ''; display: inline-block; width: 6px; height: 1.2em; background-color: #4f46e5; margin-left: 2px; vertical-align: text-bottom; animation: blink 1s step-end infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        .code-scrollbar::-webkit-scrollbar { width: 6px; }
        .code-scrollbar::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
        
        /* Cyberpunk Terminal Effect */
        .cyber-grid {
            background-image: linear-gradient(rgba(0, 255, 170, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 170, 0.03) 1px, transparent 1px);
            background-size: 20px 20px;
        }
        @keyframes scanline {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
        }
        .scanline::after {
            content: "";
            position: absolute;
            inset: 0;
            background: linear-gradient(to bottom, transparent, rgba(0, 255, 170, 0.1), transparent);
            animation: scanline 2s linear infinite;
            pointer-events: none;
        }
        .mask-gradient-bottom {
            mask-image: linear-gradient(to bottom, black 80%, transparent 100%);
        }
    `}</style>
);

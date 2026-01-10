
import React, { useRef, useState, MouseEvent } from 'react';
import { Category } from './data';

interface StrategicCompassProps {
    categories: Category[];
    selectedLook: string;
    setSelectedLook: (key: any) => void;
    selectedSubLook: string | null;
    setSelectedSubLook: (key: string | null) => void;
    onSubCategoryClick: (value: string, label: string) => void;
    activeQuery: { type: string; value: string };
}

export const StrategicCompass: React.FC<StrategicCompassProps> = ({
    categories,
    selectedLook,
    setSelectedLook,
    selectedSubLook,
    setSelectedSubLook,
    onSubCategoryClick,
    activeQuery
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleCategoryClick = (category: Category, e: React.MouseEvent<HTMLButtonElement>) => {
        if (isDragging) return; // Prevent click when dragging

        // 核心逻辑：计算并滚动到中间
        if (scrollRef.current) {
            const container = scrollRef.current;
            const target = e.currentTarget;
            
            // 目标元素中心点相对于父容器内容的偏移量
            const targetCenter = target.offsetLeft + target.offsetWidth / 2;
            // 容器可视宽度的一半
            const containerHalfWidth = container.offsetWidth / 2;
            
            // 计算需要的 scrollLeft
            const scrollTo = targetCenter - containerHalfWidth;

            container.scrollTo({
                left: scrollTo,
                behavior: 'smooth'
            });
        }

        setSelectedLook(category.key);
        setSelectedSubLook(null);
        onSubCategoryClick(category.label, category.label);
    };

    // --- Drag to Scroll Logic ---
    const handleMouseDown = (e: MouseEvent) => {
        if (!scrollRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Scroll-fast multiplier
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    return (
        <div className="w-full relative group">
            {/* Gradient masks to hint scrolling */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

            {/* Main Categories - Horizontal Scroll */}
            <div 
                ref={scrollRef}
                className={`flex items-center space-x-2 overflow-x-auto no-scrollbar py-2 px-4 md:px-0 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
            >
                {categories.map((category) => {
                    const isActive = selectedLook === category.key;
                    return (
                        <button
                            key={category.key}
                            onClick={(e) => handleCategoryClick(category, e)}
                            className={`
                                flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-300 whitespace-nowrap shadow-sm border
                                ${isActive 
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-md transform scale-105' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-sm'
                                }
                            `}
                        >
                            <category.icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-300' : 'text-slate-400'}`} />
                            <span>{category.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};


import React from 'react';
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
    
    const handleCategoryClick = (category: Category) => {
        setSelectedLook(category.key);
        setSelectedSubLook(null);
        
        // Directly trigger search with the category label as tag
        onSubCategoryClick(category.label, category.label);
    };

    return (
        <div className="w-full relative group">
            {/* Gradient masks to hint scrolling */}
            <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none md:hidden"></div>
            <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none md:hidden"></div>

            {/* Main Categories - Horizontal Scroll */}
            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-2 px-4 md:px-0">
                {categories.map((category) => {
                    const isActive = selectedLook === category.key;
                    return (
                        <button
                            key={category.key}
                            onClick={() => handleCategoryClick(category)}
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

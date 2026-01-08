
import React from 'react';
import { AgentCategory, CATEGORY_LABELS } from '../types';

interface CategoryPillProps {
    category: AgentCategory;
    isActive: boolean;
    onClick: (cat: AgentCategory) => void;
}

export const CategoryPill: React.FC<CategoryPillProps> = ({ category, isActive, onClick }) => {
    return (
        <button
            onClick={() => onClick(category)}
            className={`
                px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap
                ${isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 transform scale-105' 
                    : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                }
            `}
        >
            {CATEGORY_LABELS[category]}
        </button>
    );
};


import React from 'react';
import { Category, SubCategory } from './data';

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
    onSubCategoryClick,
}) => {
    
    const handleCategoryClick = (category: Category) => {
        setSelectedLook(category.key);
        // Directly trigger search with the category label as tag
        onSubCategoryClick(category.label, category.label);
    };

    return (
        <div className="flex flex-col w-full">
            {/* Main Categories Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {categories.map((category) => {
                    const isActive = selectedLook === category.key;
                    return (
                        <button
                            key={category.key}
                            onClick={() => handleCategoryClick(category)}
                            className={`
                                px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all
                                ${isActive 
                                    ? 'bg-slate-900 text-white shadow-sm' 
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                }
                            `}
                        >
                            {category.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

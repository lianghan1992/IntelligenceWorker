
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
        <div className="flex flex-col w-full h-full justify-center">
            {/* Main Categories */}
            <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar pb-1">
                {categories.map((category) => {
                    const isActive = selectedLook === category.key;
                    return (
                        <button
                            key={category.key}
                            onClick={() => handleCategoryClick(category)}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border
                                ${isActive 
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-md transform scale-[1.02]' 
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                                }
                            `}
                        >
                            <category.icon className={`w-4 h-4 ${isActive ? 'text-indigo-300' : 'text-slate-400'}`} />
                            <span>{category.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};


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
        
        if (category.children.length > 0) {
            const firstChild = category.children[0];
            setSelectedSubLook(firstChild.key);
            onSubCategoryClick(firstChild.keywords, firstChild.label);
        } else {
            // Use category keywords if available, otherwise label, otherwise *
            const queryValue = category.keywords || category.label || '*';
            onSubCategoryClick(queryValue, category.label);
        }
    };

    const handleSubCategoryClick = (subCategory: SubCategory) => {
        setSelectedSubLook(subCategory.key);
        onSubCategoryClick(subCategory.keywords, subCategory.label);
    }

    const activeCategory = categories.find(c => c.key === selectedLook);

    return (
        <div className="flex flex-col w-full h-full justify-center">
            {/* Level 1: Main Categories - Pills Style */}
            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
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

            {/* Level 2: Sub Categories - Only render if children exist */}
            {activeCategory && activeCategory.children.length > 0 && (
                <div className="flex items-center gap-1 mt-2 overflow-x-auto no-scrollbar animate-in fade-in slide-in-from-left-2 duration-300 pl-1">
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full mr-2 flex-shrink-0"></div>
                    {activeCategory.children.map(subCategory => {
                        const isSubActive = selectedSubLook === subCategory.key;
                        return (
                            <button
                                key={subCategory.key}
                                onClick={(e) => { e.stopPropagation(); handleSubCategoryClick(subCategory); }}
                                className={`
                                    px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap
                                    ${isSubActive
                                        ? 'bg-indigo-50 text-indigo-700 font-bold' 
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                    }
                                `}
                            >
                                {subCategory.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};


import React from 'react';
import { Category, SubCategory } from './data';
import { ChevronDownIcon } from '../icons';

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
        // Reset sub-look when switching main category
        setSelectedSubLook(null);
        
        // If it has no children, trigger filter immediately
        if (category.children.length === 0) {
            onSubCategoryClick('*', category.label);
        } else {
            // Optional: Auto-select first child? Or wait for user?
            // Let's select the first child by default for smoother UX in horizontal mode
            const firstChild = category.children[0];
            setSelectedSubLook(firstChild.key);
            onSubCategoryClick(firstChild.keywords, firstChild.label);
        }
    };

    const handleSubCategoryClick = (subCategory: SubCategory) => {
        setSelectedSubLook(subCategory.key);
        onSubCategoryClick(subCategory.keywords, subCategory.label);
    }

    const activeCategory = categories.find(c => c.key === selectedLook);

    return (
        <div className="flex flex-col w-full">
            {/* Level 1: Main Categories */}
            <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar pb-1">
                {categories.map((category) => {
                    const isPrimaryActive = selectedLook === category.key;
                    return (
                        <button
                            key={category.key}
                            onClick={() => handleCategoryClick(category)}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap
                                ${isPrimaryActive 
                                    ? 'bg-slate-800 text-white shadow-md' 
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                                }
                            `}
                        >
                            <category.icon className={`w-4 h-4 ${isPrimaryActive ? 'text-white' : 'text-slate-400'}`} />
                            <span>{category.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Level 2: Sub Categories (Conditional Render below) */}
            {activeCategory && activeCategory.children.length > 0 && (
                <div className="flex items-center space-x-2 mt-2 overflow-x-auto no-scrollbar pl-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="w-3 h-3 border-l border-b border-slate-300 rounded-bl-md mb-2 ml-2 flex-shrink-0"></div>
                    {activeCategory.children.map(subCategory => {
                        const isSubActive = activeQuery.type === 'sublook' && selectedSubLook === subCategory.key;
                        return (
                            <button
                                key={subCategory.key}
                                onClick={(e) => { e.stopPropagation(); handleSubCategoryClick(subCategory); }}
                                className={`
                                    px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap border
                                    ${isSubActive
                                        ? 'bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm' 
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
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

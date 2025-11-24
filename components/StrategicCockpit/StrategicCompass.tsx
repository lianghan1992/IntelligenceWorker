
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
    
    const handlePrimaryClick = (category: Category) => {
        const key = category.key;
        setSelectedLook(key);
        
        if (category.children.length > 0) {
            const firstSub = category.children[0];
            if (firstSub) {
                if (key !== selectedLook) {
                    setSelectedSubLook(firstSub.key);
                    onSubCategoryClick(firstSub.keywords, firstSub.label);
                }
            } else {
                setSelectedSubLook(null);
            }
        } else { 
            setSelectedSubLook(null);
            onSubCategoryClick('*', category.label); 
        }
    };

    const handleSubCategoryClick = (subCategory: SubCategory) => {
        setSelectedSubLook(subCategory.key);
        onSubCategoryClick(subCategory.keywords, subCategory.label);
    }

    return (
        <nav className="space-y-2">
            {categories.map((category) => {
                const isPrimaryActive = selectedLook === category.key;
                return (
                    <div key={category.key}>
                        {/* Primary Category Item */}
                        <div 
                            onClick={() => handlePrimaryClick(category)}
                            className={`
                                group flex items-center justify-between px-4 py-3 rounded-2xl cursor-pointer transition-all duration-300 select-none border
                                ${isPrimaryActive 
                                    ? 'bg-white border-indigo-100 shadow-sm text-indigo-900' 
                                    : 'bg-transparent border-transparent text-slate-600 hover:bg-white hover:shadow-sm hover:text-slate-900'
                                }
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-lg transition-colors ${isPrimaryActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 group-hover:text-slate-700'}`}>
                                    <category.icon className="w-4 h-4" />
                                </div>
                                <span className={`text-sm font-medium ${isPrimaryActive ? 'font-bold' : ''}`}>{category.label}</span>
                            </div>
                            {category.children.length > 0 && (
                                <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isPrimaryActive ? 'rotate-180 text-indigo-500' : ''}`} />
                            )}
                        </div>

                        {/* Sub Categories */}
                        <div className={`
                            overflow-hidden transition-all duration-300 ease-in-out
                            ${isPrimaryActive && category.children.length > 0 ? 'max-h-96 opacity-100 mt-1 mb-3' : 'max-h-0 opacity-0'}
                        `}>
                            <div className="space-y-1 pl-4 pr-2 relative">
                                {/* Vertical Line */}
                                <div className="absolute left-[21px] top-0 bottom-0 w-[2px] bg-slate-100 rounded-full"></div>
                                
                                {category.children.map(subCategory => {
                                    const isSubActive = activeQuery.type === 'sublook' && selectedSubLook === subCategory.key;
                                    return (
                                        <button
                                            key={subCategory.key}
                                            onClick={(e) => { e.stopPropagation(); handleSubCategoryClick(subCategory); }}
                                            className={`
                                                relative w-full text-left pl-8 pr-4 py-2 rounded-xl text-sm transition-all duration-200 flex items-center ml-1
                                                ${isSubActive
                                                    ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm' 
                                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium'
                                                }
                                            `}
                                        >
                                            {/* Dot Indicator */}
                                            {isSubActive && (
                                                <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[5px] w-2.5 h-2.5 bg-indigo-600 rounded-full border-2 border-white shadow-sm z-10"></span>
                                            )}
                                            {subCategory.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </nav>
    );
};

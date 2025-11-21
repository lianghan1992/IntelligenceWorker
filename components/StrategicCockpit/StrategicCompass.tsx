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
        // Toggle functionality: if clicking already active, keep it active but maybe collapse? 
        // Material 3 drawers usually keep selection.
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
        <nav className="space-y-1">
            {categories.map((category) => {
                const isPrimaryActive = selectedLook === category.key;
                return (
                    <div key={category.key} className="mb-1">
                        {/* Primary Category Item - Material 3 Style */}
                        <div 
                            onClick={() => handlePrimaryClick(category)}
                            className={`
                                group flex items-center justify-between px-4 py-3 rounded-full cursor-pointer transition-all duration-300 select-none
                                ${isPrimaryActive 
                                    ? 'bg-blue-100/50 text-blue-900' 
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                }
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <category.icon className={`w-5 h-5 ${isPrimaryActive ? 'text-blue-700' : 'text-gray-500 group-hover:text-gray-700'}`} />
                                <span className={`text-sm font-medium ${isPrimaryActive ? 'font-semibold' : ''}`}>{category.label}</span>
                            </div>
                            {category.children.length > 0 && (
                                <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isPrimaryActive ? 'rotate-180 text-blue-700' : ''}`} />
                            )}
                        </div>

                        {/* Sub Categories */}
                        <div className={`
                            overflow-hidden transition-all duration-300 ease-in-out
                            ${isPrimaryActive && category.children.length > 0 ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'}
                        `}>
                            <div className="space-y-1 pl-3">
                                {category.children.map(subCategory => {
                                    const isSubActive = activeQuery.type === 'sublook' && selectedSubLook === subCategory.key;
                                    return (
                                        <button
                                            key={subCategory.key}
                                            onClick={(e) => { e.stopPropagation(); handleSubCategoryClick(subCategory); }}
                                            className={`
                                                w-full text-left px-4 py-2 rounded-full text-sm transition-colors duration-200 flex items-center
                                                ${isSubActive
                                                    ? 'bg-blue-200 text-blue-900 font-semibold' 
                                                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                                                }
                                            `}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full mr-3 ${isSubActive ? 'bg-blue-700' : 'bg-transparent'}`}></span>
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
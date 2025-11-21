
import React from 'react';
import { StrategicLookKey } from '../../types';
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
    
    const handlePrimaryClick = (category: Category) => {
        const key = category.key;
        setSelectedLook(key);
        
        if (category.children.length > 0) {
            const firstSub = category.children[0];
            if (firstSub) {
                // Only change sub-look if the primary category is changing
                if (key !== selectedLook) {
                    setSelectedSubLook(firstSub.key);
                    onSubCategoryClick(firstSub.keywords, firstSub.label);
                }
            } else {
                setSelectedSubLook(null);
            }
        } else { // Handle categories with no children
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
                        {/* Primary Category Item */}
                        <div 
                            onClick={() => handlePrimaryClick(category)}
                            className={`
                                flex items-center px-4 py-3 rounded-full cursor-pointer transition-all duration-200 select-none
                                ${isPrimaryActive 
                                    ? 'bg-blue-100 text-blue-900 font-semibold' 
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                }
                            `}
                        >
                            <category.icon className={`w-5 h-5 mr-3 ${isPrimaryActive ? 'text-blue-700' : 'text-gray-500'}`} />
                            <span className="text-sm">{category.label}</span>
                        </div>

                        {/* Sub Categories */}
                        {isPrimaryActive && category.children.length > 0 && (
                            <div className="mt-1 ml-4 pl-4 border-l-2 border-gray-100 space-y-1 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                                {category.children.map(subCategory => {
                                    const isSubActive = activeQuery.type === 'sublook' && selectedSubLook === subCategory.key;
                                    return (
                                        <button
                                            key={subCategory.key}
                                            onClick={(e) => { e.stopPropagation(); handleSubCategoryClick(subCategory); }}
                                            className={`
                                                w-full text-left px-4 py-2.5 rounded-full text-sm font-medium transition-colors duration-200
                                                ${isSubActive
                                                    ? 'bg-blue-50 text-blue-800' 
                                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
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
            })}
        </nav>
    );
};

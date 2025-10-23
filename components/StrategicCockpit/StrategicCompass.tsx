import React from 'react';
import { StrategicLookKey } from '../../types';
import { ChevronDownIcon } from '../icons';

interface SubCategory {
    key: string;
    label: string;
}

interface Category {
    key: StrategicLookKey;
    label: string;
    icon: React.FC<any>;
    description: string;
    hasSettings: boolean;
    children: SubCategory[];
}

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
    
    const handlePrimaryClick = (key: StrategicLookKey) => {
        if (key !== selectedLook) {
            setSelectedLook(key);
            const category = categories.find(c => c.key === key);
            const firstSub = category?.children[0];
            if (firstSub) {
                setSelectedSubLook(firstSub.key);
                onSubCategoryClick(firstSub.key, firstSub.label);
            } else {
                setSelectedSubLook(null);
            }
        }
    };

    const handleSubCategoryClick = (subCategory: SubCategory) => {
        setSelectedSubLook(subCategory.key);
        onSubCategoryClick(subCategory.key, subCategory.label);
    }

    return (
        <nav className="w-full bg-white rounded-2xl border border-gray-200 p-3 space-y-1">
            {categories.map((category) => {
                const isPrimaryActive = selectedLook === category.key;
                return (
                    <div key={category.key}>
                        <button
                            onClick={() => handlePrimaryClick(category.key)}
                            className={`w-full flex items-center justify-between text-left p-3 rounded-lg text-sm font-semibold transition-colors duration-200
                                ${isPrimaryActive 
                                    ? 'bg-blue-50 text-blue-700' 
                                    : 'text-gray-600 hover:bg-gray-100'
                                }
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <category.icon className={`w-5 h-5 ${isPrimaryActive ? 'text-blue-600' : 'text-gray-500'}`} />
                                <span>{category.label}</span>
                            </div>
                            <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isPrimaryActive ? 'rotate-180' : ''}`} />
                        </button>

                        {isPrimaryActive && category.children.length > 0 && (
                            <div className="pl-6 pt-2 pb-1 space-y-1 animate-in fade-in-0 duration-300">
                                {category.children.map(subCategory => {
                                    const isSubActive = activeQuery.type === 'sublook' && selectedSubLook === subCategory.key;
                                    return (
                                        <button
                                            key={subCategory.key}
                                            onClick={() => handleSubCategoryClick(subCategory)}
                                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors relative flex items-center
                                                ${isSubActive
                                                    ? 'font-semibold text-blue-700' 
                                                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                                                }
                                            `}
                                        >
                                            {isSubActive && 
                                                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 bg-blue-600 rounded-r-full"></span>
                                            }
                                            <span className="ml-2">{subCategory.label}</span>
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

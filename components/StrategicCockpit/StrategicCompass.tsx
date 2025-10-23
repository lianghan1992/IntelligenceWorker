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
    selectedLook: StrategicLookKey;
    setSelectedLook: (key: StrategicLookKey) => void;
    selectedSubLook: string | null;
    setSelectedSubLook: (key: string | null) => void;
}

export const StrategicCompass: React.FC<StrategicCompassProps> = ({
    categories,
    selectedLook,
    setSelectedLook,
    selectedSubLook,
    setSelectedSubLook
}) => {
    
    const handlePrimaryClick = (key: StrategicLookKey) => {
        if (key === selectedLook) {
          // Clicking the same one again could toggle it, but for accordion style, we'll just let it be.
          // Or we can toggle by setting to null: setSelectedLook(selectedLook === key ? null : key);
          return;
        }
        setSelectedLook(key);
        // Automatically select the first sub-item when a new primary is selected
        const category = categories.find(c => c.key === key);
        setSelectedSubLook(category?.children[0]?.key || null);
    };

    return (
        <nav className="w-full bg-white rounded-2xl border border-gray-200 p-3 space-y-1">
            {categories.map((category) => {
                const isActive = selectedLook === category.key;
                return (
                    <div key={category.key}>
                        <button
                            onClick={() => handlePrimaryClick(category.key)}
                            className={`w-full flex items-center justify-between text-left p-3 rounded-lg text-sm font-semibold transition-colors duration-200
                                ${isActive 
                                    ? 'bg-blue-50 text-blue-700' 
                                    : 'text-gray-600 hover:bg-gray-100'
                                }
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <category.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                                <span>{category.label}</span>
                            </div>
                            <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isActive ? 'rotate-180' : ''}`} />
                        </button>

                        {isActive && category.children.length > 0 && (
                            <div className="pl-6 pt-2 pb-1 space-y-1 animate-in fade-in-0 duration-300">
                                {category.children.map(subCategory => (
                                    <button
                                        key={subCategory.key}
                                        onClick={() => setSelectedSubLook(subCategory.key)}
                                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors relative flex items-center
                                            ${selectedSubLook === subCategory.key 
                                                ? 'font-semibold text-blue-700' 
                                                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                                            }
                                        `}
                                    >
                                        {selectedSubLook === subCategory.key && 
                                            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 bg-blue-600 rounded-r-full"></span>
                                        }
                                        <span className="ml-2">{subCategory.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </nav>
    );
};

import React from 'react';
import { StrategicLookKey } from '../../types';
import { GearIcon } from '../icons';

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

const PrimaryCategory: React.FC<{
    look: Category;
    isActive: boolean;
    onClick: () => void;
}> = ({ look, isActive, onClick }) => (
    <div
        onClick={onClick}
        className={`w-full p-3 rounded-xl border transition-all duration-300 cursor-pointer group ${
            isActive 
                ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-blue-300'
        }`}
    >
        <div className="flex items-center space-x-3">
            <div className={`flex-shrink-0 p-2 rounded-lg ${isActive ? 'bg-white/20' : 'bg-slate-100'}`}>
                <look.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-600'}`} />
            </div>
            <div>
                <h3 className="font-bold text-sm">{look.label}</h3>
            </div>
        </div>
    </div>
);

const SubCategoryChips: React.FC<{
    subCategories: SubCategory[];
    selectedSubLook: string | null;
    onSelect: (key: string) => void;
}> = ({ subCategories, selectedSubLook, onSelect }) => (
    <div className="pl-4 pr-1 pt-3 pb-2 animate-in fade-in-0 duration-300">
        <div className="flex flex-wrap gap-2">
            {subCategories.map(sub => (
                <button
                    key={sub.key}
                    onClick={() => onSelect(sub.key)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                        selectedSubLook === sub.key
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                >
                    {sub.label}
                </button>
            ))}
        </div>
    </div>
);

export const StrategicCompass: React.FC<StrategicCompassProps> = ({
    categories,
    selectedLook,
    setSelectedLook,
    selectedSubLook,
    setSelectedSubLook
}) => {
    
    const handlePrimaryClick = (key: StrategicLookKey) => {
        setSelectedLook(key);
        // Reset sub-category or set to default when primary category changes
        const category = categories.find(c => c.key === key);
        setSelectedSubLook(category?.children[0]?.key || null);
    };

    return (
        <div className="space-y-3">
            {categories.map((look) => (
                <div key={look.key}>
                    <PrimaryCategory
                        look={look}
                        isActive={selectedLook === look.key}
                        onClick={() => handlePrimaryClick(look.key)}
                    />
                    {selectedLook === look.key && look.children.length > 0 && (
                        <SubCategoryChips
                            subCategories={look.children}
                            selectedSubLook={selectedSubLook}
                            onSelect={setSelectedSubLook}
                        />
                    )}
                </div>
            ))}
        </div>
    );
};

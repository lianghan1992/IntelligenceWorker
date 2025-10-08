

import React, { useState, useMemo } from 'react';
import { DeepDive } from '../types';
import { SearchIcon } from './icons';

interface DeepDivesProps {
    dives: DeepDive[];
}

const DeepDiveCard: React.FC<{ dive: DeepDive }> = ({ dive }) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden group flex flex-col h-full shadow-sm hover:shadow-xl transition-shadow duration-300">
        <div className="h-56 overflow-hidden">
            <img src={dive.imageUrl} alt={dive.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
        </div>
        <div className="p-6 flex flex-col flex-grow">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{dive.title}</h3>
            <p className="text-sm text-gray-600 mb-4 flex-grow">{dive.summary}</p>
            <p className="text-xs text-gray-500 mt-auto">{dive.author} - {dive.date}</p>
            <div className="mt-4 flex flex-wrap gap-2">
                {dive.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">{tag}</span>
                ))}
            </div>
        </div>
    </div>
);

const FilterButton: React.FC<{ label: string; isActive: boolean; onClick: () => void }> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-medium rounded-full transition-colors duration-200 ${
            isActive ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-700 hover:bg-gray-100 border'
        }`}
    >
        {label}
    </button>
);


export const DeepDives: React.FC<DeepDivesProps> = ({ dives }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPrimary, setSelectedPrimary] = useState<string | null>(null);
    const [selectedSecondary, setSelectedSecondary] = useState<string | null>(null);

    const primaryCategories = useMemo(() => Array.from(new Set(dives.map(d => d.category.primary))), [dives]);
    
    const secondaryCategories = useMemo(() => {
        if (!selectedPrimary) return [];
        return Array.from(new Set(dives.filter(d => d.category.primary === selectedPrimary).map(d => d.category.secondary)));
    }, [dives, selectedPrimary]);
    
    // Reset secondary filter when primary changes
    const handlePrimarySelect = (primary: string | null) => {
        setSelectedPrimary(primary);
        setSelectedSecondary(null);
    };

    const filteredDives = useMemo(() => {
        return dives.filter(dive => {
            const matchesSearch = searchTerm === '' ||
                dive.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                dive.summary.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesPrimary = !selectedPrimary || dive.category.primary === selectedPrimary;
            
            const matchesSecondary = !selectedSecondary || dive.category.secondary === selectedSecondary;
            
            return matchesSearch && matchesPrimary && matchesSecondary;
        });
    }, [dives, searchTerm, selectedPrimary, selectedSecondary]);

    return (
        <div className="p-6">
            <div className="bg-gray-50 p-4 rounded-xl mb-6 border">
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-4">
                    <span className="text-sm font-semibold text-gray-600 sm:w-20 flex-shrink-0 mb-2 sm:mb-0">一级分类:</span>
                    <div className="flex flex-wrap gap-2">
                        <FilterButton label="全部" isActive={!selectedPrimary} onClick={() => handlePrimarySelect(null)} />
                        {primaryCategories.map(cat => (
                            <FilterButton key={cat} label={cat} isActive={selectedPrimary === cat} onClick={() => handlePrimarySelect(cat)} />
                        ))}
                    </div>
                </div>
                
                {selectedPrimary && secondaryCategories.length > 0 && (
                     <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mb-4 animate-in fade-in-0 duration-300">
                        <span className="text-sm font-semibold text-gray-600 sm:w-20 flex-shrink-0 mb-2 sm:mb-0">二级分类:</span>
                        <div className="flex flex-wrap gap-2">
                            <FilterButton label="全部" isActive={!selectedSecondary} onClick={() => setSelectedSecondary(null)} />
                            {secondaryCategories.map(cat => (
                                <FilterButton key={cat} label={cat} isActive={selectedSecondary === cat} onClick={() => setSelectedSecondary(cat)} />
                            ))}
                        </div>
                    </div>
                )}
               
                <div className="relative">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="在结果中搜索标题或摘要..."
                        className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {filteredDives.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDives.map(dive => (
                        <DeepDiveCard key={dive.id} dive={dive} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 col-span-full">
                    <p className="text-gray-500">暂无深度洞察专题。</p>
                </div>
            )}
        </div>
    );
};
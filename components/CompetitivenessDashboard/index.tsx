import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getEntities, getModules } from '../../api';
import { CompetitivenessEntity } from '../../types';
import { VehicleTechnologyCard } from './VehicleTechnologyCard';
import { SearchIcon, ChevronDownIcon, CloseIcon, UsersIcon } from '../icons';

// --- Reusable MultiSelect Dropdown Component ---
interface MultiSelectProps {
    options: CompetitivenessEntity[];
    selected: CompetitivenessEntity[];
    onChange: (selected: CompetitivenessEntity[]) => void;
    placeholder?: string;
}

const MultiSelectDropdown: React.FC<MultiSelectProps> = ({ options, selected, onChange, placeholder = "选择实体..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredOptions = options.filter(option =>
        option.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !selected.some(s => s.id === option.id)
    );

    const toggleOption = (option: CompetitivenessEntity) => {
        if (selected.some(s => s.id === option.id)) {
            onChange(selected.filter(s => s.id !== option.id));
        } else {
            onChange([...selected, option]);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative w-full max-w-2xl" ref={dropdownRef}>
            <div className="flex items-center gap-2 flex-wrap p-2 border border-gray-300 bg-white rounded-lg cursor-text" onClick={() => setIsOpen(true)}>
                <UsersIcon className="w-5 h-5 text-gray-400 flex-shrink-0 ml-1" />
                {selected.length === 0 && !isOpen && <span className="text-gray-500">{placeholder}</span>}
                {selected.map(item => (
                    <span key={item.id} className="flex items-center gap-1.5 bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-1 rounded-full">
                        {item.name}
                        <button type="button" onClick={(e) => { e.stopPropagation(); toggleOption(item); }} className="text-blue-500 hover:text-blue-700">
                            <CloseIcon className="w-3 h-3" />
                        </button>
                    </span>
                ))}
                 <div className="flex-1 min-w-[100px]">
                     <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        onFocus={() => setIsOpen(true)}
                        placeholder={selected.length > 0 ? "" : "搜索..."}
                        className="w-full bg-transparent focus:outline-none text-sm p-1"
                    />
                 </div>
                <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg border max-h-60 overflow-y-auto">
                    {filteredOptions.length > 0 ? (
                         filteredOptions.map(option => (
                            <div
                                key={option.id}
                                onClick={() => { toggleOption(option); setSearchTerm(''); }}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                            >
                                <span>{option.name}</span>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{option.entity_type}</span>
                            </div>
                        ))
                    ) : (
                        <div className="px-4 py-2 text-gray-500">未找到实体</div>
                    )}
                </div>
            )}
        </div>
    );
};


// --- Main Dashboard Component ---
export const CompetitivenessDashboard: React.FC = () => {
    const [allEntities, setAllEntities] = useState<CompetitivenessEntity[]>([]);
    const [selectedEntities, setSelectedEntities] = useState<CompetitivenessEntity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchAllEntities = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            // Fetch all active car_brand and car_model entities for the selector
            const brandsRes = await getEntities({ size: 1000, is_active: true, entity_type: 'car_brand' });
            const modelsRes = await getEntities({ size: 1000, is_active: true, entity_type: 'car_model' });
            
            const combined = [...(brandsRes.items || []), ...(modelsRes.items || [])];
            // Sort by name for better UX in the dropdown
            combined.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

            setAllEntities(combined);

        } catch (e: any) {
            setError(e.message || '加载实体列表失败');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllEntities();
    }, [fetchAllEntities]);
    
    const selectedEntityIds = useMemo(() => selectedEntities.map(e => e.id), [selectedEntities]);

    return (
        <div className="p-6 bg-gray-50/70 h-full overflow-y-auto">
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">竞争力看板</h1>
                <p className="text-gray-600 mt-1">选择您关注的实体，洞察其在各个维度的最新情报。</p>
            </header>

            <div className="sticky top-0 z-20 bg-gray-50/70 backdrop-blur-sm py-4 mb-6">
                {isLoading ? (
                    <div className="h-[50px] bg-gray-200 rounded-lg animate-pulse max-w-2xl"></div>
                ) : error ? (
                    <div className="p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
                ) : (
                     <MultiSelectDropdown
                        options={allEntities}
                        selected={selectedEntities}
                        onChange={setSelectedEntities}
                        placeholder="选择或搜索要对比的实体 (例如: 小米汽车, 特斯拉...)"
                    />
                )}
            </div>

            <main className="space-y-8">
                {selectedEntityIds.length > 0 ? (
                    <VehicleTechnologyCard selectedEntityIds={selectedEntityIds} />
                    // 未来可以添加更多卡片
                    // <MarketAnalysisCard selectedEntityIds={selectedEntityIds} />
                    // <SupplyChainCard selectedEntityIds={selectedEntityIds} />
                ) : (
                    <div className="flex flex-col items-center justify-center text-center py-20 bg-white rounded-xl border-2 border-dashed">
                        <UsersIcon className="w-16 h-16 text-gray-300 mb-4" />
                        <h2 className="text-xl font-semibold text-gray-700">请选择实体开始分析</h2>
                        <p className="text-gray-500 mt-2">从上方的筛选器中选择一个或多个您感兴趣的实体，<br />系统将自动加载相关的竞争力情报。</p>
                    </div>
                )}
            </main>
        </div>
    );
};
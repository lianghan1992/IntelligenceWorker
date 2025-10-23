// FIX: Import `useEffect` from React to fix 'Cannot find name' error.
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    ComparisonMode,
    TechDimensionCategory,
    VehicleTechSpec,
    NewTechForecast,
    SpecDetail
} from '../../types';
import {
    techDimensions,
    mockVehicleSpecs,
    mockSuppliers,
    mockPlatforms,
    mockTechForecasts,
} from '../../mockData';
import { ChartIcon, BrainIcon, TagIcon, UsersIcon, TrendingUpIcon, ChevronDownIcon, CloseIcon, ChevronUpIcon } from '../icons';
import { FaIndustry } from 'react-icons/fa'; // Placeholder for a better icon

const modeOptions: { key: ComparisonMode; label: string; icon: React.FC<any> }[] = [
    { key: 'competitor', label: '竞品对位', icon: UsersIcon },
    { key: 'brand', label: '产品梯队', icon: TagIcon },
    { key: 'evolution', label: '车型演进', icon: TrendingUpIcon },
    { key: 'tech', label: '技术专题', icon: ChartIcon },
    { key: 'supply_chain', label: '供应链/平台', icon: FaIndustry },
    { key: 'forecast', label: '新技术预测', icon: BrainIcon },
];

const techDimensionDetails: { [key: string]: { label: string, sub: { [key: string]: string } } } = techDimensions.reduce((acc, cat) => {
    acc[cat.key] = {
        label: cat.label,
        sub: cat.subDimensions.reduce((subAcc, sub) => {
            subAcc[sub.key] = sub.label;
            return subAcc;
        }, {} as { [key: string]: string })
    };
    return acc;
}, {} as { [key: string]: { label: string, sub: { [key: string]: string } } });


// --- Reusable & Helper Components ---

const ModeTab: React.FC<{
    m_key: ComparisonMode,
    label: string,
    icon: React.FC<any>,
    isActive: boolean,
    onClick: () => void
}> = ({ m_key, label, icon: Icon, isActive, onClick }) => (
    <button
        key={m_key}
        onClick={onClick}
        className={`flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
            isActive ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
        }`}
    >
        <Icon className="w-5 h-5" />
        <span>{label}</span>
    </button>
);

const renderSpecValue = (spec: string | SpecDetail | null | undefined): React.ReactNode => {
    if (spec === null || spec === undefined) {
        return <span className="text-gray-400">-</span>;
    }
    if (typeof spec === 'string') {
        return spec;
    }
    if (typeof spec === 'object' && 'value' in spec) {
        return (
            <div className="flex flex-col">
                <span className="font-semibold text-gray-800">{spec.value}</span>
                {spec.supplier && <span className="text-xs text-gray-500 mt-0.5">@{spec.supplier}</span>}
            </div>
        );
    }
    return <span className="text-gray-400">-</span>;
};


// --- Comparison View Components (Cards) ---

const VehicleSpecCard: React.FC<{ vehicle: VehicleTechSpec, highlightedSpecs: Set<string> }> = ({ vehicle, highlightedSpecs }) => {
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(techDimensions.map(td => td.key)));

    const toggleCategory = (key: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };

    return (
        <div className="flex-shrink-0 w-80 bg-white rounded-2xl border border-gray-200/80 shadow-lg overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
                <h3 className="font-bold text-lg text-gray-800 truncate">{vehicle.name}</h3>
                <p className="text-sm text-gray-500">{vehicle.brand}</p>
            </div>
            <div className="divide-y divide-gray-100">
                {techDimensions.map(category => (
                    <div key={category.key}>
                        <button onClick={() => toggleCategory(category.key)} className="w-full flex justify-between items-center p-3 bg-white hover:bg-gray-50 text-left">
                            <span className="font-semibold text-sm text-gray-700">{category.label}</span>
                            <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${expandedCategories.has(category.key) ? 'rotate-180' : ''}`} />
                        </button>
                        {expandedCategories.has(category.key) && (
                            <div className="px-3 pb-3 space-y-2 bg-white animate-in fade-in-0 duration-300">
                                {category.subDimensions.map(subDim => (
                                    <div key={subDim.key} className="p-2 rounded-md hover:bg-gray-50/80 relative">
                                        {highlightedSpecs.has(`${category.key}-${subDim.key}`) && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-yellow-400 rounded-r-full"></div>}
                                        <p className="text-xs text-gray-500 pl-2">{subDim.label}</p>
                                        <div className="text-sm pl-2 mt-0.5">{renderSpecValue(vehicle.specs[category.key]?.[subDim.key])}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};


// --- New Technology Forecast View Components (Table) ---

const SourceModal: React.FC<{ forecast: NewTechForecast; onClose: () => void }> = ({ forecast, onClose }) => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
            <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">情报溯源</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><CloseIcon className="w-6 h-6" /></button>
            </div>
            <div className="p-6">
                <p className="font-semibold text-gray-800">{forecast.techName}</p>
                <p className="text-sm text-gray-600 mt-1">{forecast.brand} {forecast.model}</p>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                    <p className="text-sm font-medium text-gray-800">来源文章:</p>
                    <a href={forecast.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-words">
                        {forecast.sourceArticle}
                    </a>
                </div>
            </div>
        </div>
    </div>
);

const ForecastCell: React.FC<{ forecast: NewTechForecast; onSourceClick: () => void }> = ({ forecast, onSourceClick }) => {
    const confidenceColor = forecast.confidence > 0.8 ? 'bg-green-500' : forecast.confidence > 0.5 ? 'bg-yellow-500' : 'bg-red-500';
    const statusInfo = forecast.status === 'confirmed'
        ? { text: '已证实', bg: 'bg-green-100', text_color: 'text-green-800' }
        : { text: '传闻中', bg: 'bg-yellow-100', text_color: 'text-yellow-800' };

    return (
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm w-full min-w-[200px] mb-2 last:mb-0">
            <div className="flex justify-between items-start">
                <p className="font-semibold text-gray-800 text-sm leading-tight pr-2">{forecast.techName}</p>
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full whitespace-nowrap ${statusInfo.bg} ${statusInfo.text_color}`}>{statusInfo.text}</span>
            </div>
            <div className="mt-2.5">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500">可信度</span>
                    <button onClick={onSourceClick} className="text-xs font-semibold text-blue-600 hover:underline">溯源</button>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className={`${confidenceColor} h-1.5 rounded-full`} style={{ width: `${forecast.confidence * 100}%` }}></div>
                </div>
            </div>
        </div>
    );
};


const ForecastView: React.FC = () => {
    const [sourceModalOpen, setSourceModalOpen] = useState(false);
    const [selectedForecast, setSelectedForecast] = useState<NewTechForecast | null>(null);
    const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());
    const [brandFilter, setBrandFilter] = useState<string[]>([]);

    const brands = useMemo(() => Array.from(new Set(mockTechForecasts.map(fc => fc.brand))), []);

    const groupedForecasts = useMemo(() => {
        const filtered = mockTechForecasts.filter(fc => brandFilter.length === 0 || brandFilter.includes(fc.brand));
        return filtered.reduce((acc, fc) => {
            const key = `${fc.brand}-${fc.model}`;
            if (!acc[key]) acc[key] = { brand: fc.brand, model: fc.model, forecasts: {} };
            if (!acc[key].forecasts[fc.techDimensionKey]) acc[key].forecasts[fc.techDimensionKey] = [];
            acc[key].forecasts[fc.techDimensionKey].push(fc);
            return acc;
        }, {} as Record<string, { brand: string, model: string, forecasts: Record<string, NewTechForecast[]> }>);
    }, [brandFilter]);

    const handleSourceClick = (forecast: NewTechForecast) => {
        setSelectedForecast(forecast);
        setSourceModalOpen(true);
    };

    const toggleBrand = (brand: string) => {
        setExpandedBrands(prev => {
            const newSet = new Set(prev);
            if (newSet.has(brand)) newSet.delete(brand);
            else newSet.add(brand);
            return newSet;
        });
    };

    const handleFilterChange = (brand: string) => {
        setBrandFilter(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]);
    };

    const rowsByBrand = useMemo(() => {
        return Object.values(groupedForecasts).reduce((acc, row) => {
            if (!acc[row.brand]) acc[row.brand] = [];
            acc[row.brand].push(row);
            return acc;
        }, {} as Record<string, any[]>);
    }, [groupedForecasts]);
    
    useEffect(() => {
        // Initially expand all brands that have forecasts
        setExpandedBrands(new Set(Object.keys(rowsByBrand)));
    }, [rowsByBrand]);

    const forecastTechDimensions = techDimensions.filter(d => ['smart_driving', 'smart_cockpit', 'connectivity', 'chassis', 'power', 'body_structure'].includes(d.key));

    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200">
            <div className="mb-4">
                <label className="text-sm font-semibold text-gray-700">筛选车企：</label>
                <div className="flex flex-wrap gap-2 mt-2">
                    {brands.map(brand => (
                        <button key={brand} onClick={() => handleFilterChange(brand)}
                            className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${brandFilter.includes(brand) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
                            {brand}
                        </button>
                    ))}
                    {brandFilter.length > 0 && <button onClick={() => setBrandFilter([])} className="text-xs text-blue-600 hover:underline">清空</button>}
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] border-collapse">
                    <thead className="sticky top-0 bg-white/80 backdrop-blur-sm z-10">
                        <tr>
                            <th className="p-3 text-left text-sm font-semibold text-gray-600 w-[200px]">车企/车型</th>
                            {forecastTechDimensions.map(dim => (
                                <th key={dim.key} className="p-3 text-left text-sm font-semibold text-gray-600 w-[240px]">{dim.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(rowsByBrand).map(([brand, modelRows]) => (
                            <React.Fragment key={brand}>
                                <tr className="bg-gray-50/70 border-t border-b border-gray-200">
                                    <td colSpan={forecastTechDimensions.length + 1} className="p-2">
                                        <button onClick={() => toggleBrand(brand)} className="flex items-center gap-2 font-bold text-gray-800">
                                            {expandedBrands.has(brand) ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                                            {brand}
                                        </button>
                                    </td>
                                </tr>
                                {expandedBrands.has(brand) && modelRows.map((row, index) => (
                                    <tr key={`${row.brand}-${row.model}-${index}`} className="align-top">
                                        <td className="p-3 text-sm font-medium text-gray-700 border-b border-gray-100">{row.model}</td>
                                        {forecastTechDimensions.map(dim => (
                                            <td key={dim.key} className="p-2 border-b border-gray-100">
                                                {row.forecasts[dim.key]?.map(fc => (
                                                    <ForecastCell key={fc.id} forecast={fc} onSourceClick={() => handleSourceClick(fc)} />
                                                ))}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            {sourceModalOpen && selectedForecast && <SourceModal forecast={selectedForecast} onClose={() => setSourceModalOpen(false)} />}
        </div>
    );
};


// --- Main Dashboard Component ---

export const TechDashboard: React.FC = () => {
    const [mode, setMode] = useState<ComparisonMode>('competitor');

    // State for selections
    const [competitorSelection, setCompetitorSelection] = useState<string[]>(['xiaomi-su7-max', 'tesla-model3-2024', 'wenjie-m7-2024']);
    const [brandSelection, setBrandSelection] = useState<string>('理想');
    const [evolutionSelection, setEvolutionSelection] = useState<string>('问界 M7');
    const [techSelection, setTechSelection] = useState<string>('power.platform');
    const [supplyChainSelection, setSupplyChainSelection] = useState<{ type: 'supplier' | 'platform', value: string }>({ type: 'supplier', value: 'NVIDIA' });

    // State for modals
    const [sourceModalOpen, setSourceModalOpen] = useState(false);
    const [selectedForecast, setSelectedForecast] = useState<NewTechForecast | null>(null);

    const handleModeChange = (newMode: ComparisonMode) => {
        setMode(newMode);
    };

    const handleSelectionChange = (type: string, value: any) => {
        switch (type) {
            case 'competitor': setCompetitorSelection(value); break;
            case 'brand': setBrandSelection(value); break;
            case 'evolution': setEvolutionSelection(value); break;
            case 'tech': setTechSelection(value); break;
            case 'supply_chain_type': setSupplyChainSelection(prev => ({ ...prev, type: value, value: '' })); break;
            case 'supply_chain_value': setSupplyChainSelection(prev => ({ ...prev, value })); break;
        }
    };
    
    // Memoized data for selectors
    const brands = useMemo(() => Array.from(new Set(mockVehicleSpecs.map(v => v.brand))), []);
    const modelsByBrand = useMemo(() => mockVehicleSpecs.reduce((acc, v) => {
        if (!acc[v.brand]) acc[v.brand] = [];
        if (!acc[v.brand].includes(v.model)) acc[v.brand].push(v.model);
        return acc;
    }, {} as Record<string, string[]>), []);
    const uniqueModels = useMemo(() => Array.from(new Set(mockVehicleSpecs.map(v => `${v.brand} ${v.model}`))), []);
    const techOptions = useMemo(() => techDimensions.flatMap(cat => cat.subDimensions.map(sub => ({
        value: `${cat.key}.${sub.key}`,
        label: `${cat.label} - ${sub.label}`
    }))), []);


    const displayedVehicles = useMemo((): VehicleTechSpec[] => {
        switch (mode) {
            case 'competitor':
                return mockVehicleSpecs.filter(v => competitorSelection.includes(v.id));
            case 'brand':
                return mockVehicleSpecs.filter(v => v.brand === brandSelection);
            case 'evolution':
                const [brand, model] = evolutionSelection.split(' ');
                return mockVehicleSpecs.filter(v => v.brand === brand && v.model === model).sort((a,b) => a.year - b.year);
            case 'tech':
                 return mockVehicleSpecs.filter(v => {
                    const [catKey, subKey] = techSelection.split('.');
                    return v.specs[catKey]?.[subKey] != null;
                 });
            case 'supply_chain':
                if (!supplyChainSelection.value) return [];
                if (supplyChainSelection.type === 'platform') {
                    return mockVehicleSpecs.filter(v => v.platform === supplyChainSelection.value);
                }
                // Supplier
                return mockVehicleSpecs.filter(v => 
                    Object.values(v.specs).some(cat => 
                        Object.values(cat).some(spec => 
                            typeof spec === 'object' && spec?.supplier === supplyChainSelection.value
                        )
                    )
                );
            default:
                return [];
        }
    }, [mode, competitorSelection, brandSelection, evolutionSelection, techSelection, supplyChainSelection]);
    
    const highlightedSpecs = useMemo(() => {
        if (displayedVehicles.length < 2) return new Set<string>();
        const diffs = new Set<string>();
        techDimensions.forEach(category => {
            category.subDimensions.forEach(subDim => {
                const specKey = `${category.key}-${subDim.key}`;
                const firstSpec = displayedVehicles[0].specs[category.key]?.[subDim.key];
                const firstValue = typeof firstSpec === 'object' ? firstSpec?.value : firstSpec;
                for (let i = 1; i < displayedVehicles.length; i++) {
                    const currentSpec = displayedVehicles[i].specs[category.key]?.[subDim.key];
                    const currentValue = typeof currentSpec === 'object' ? currentSpec?.value : currentSpec;
                    if (firstValue !== currentValue) {
                        diffs.add(specKey);
                        break;
                    }
                }
            });
        });
        return diffs;
    }, [displayedVehicles]);

    const renderControls = () => (
        <div className="mb-6 p-4 bg-white rounded-xl border border-gray-200/80 shadow-sm animate-in fade-in-0 duration-300">
             {mode === 'competitor' && (
                <div className="flex flex-wrap gap-2">
                    {mockVehicleSpecs.map(v => (
                        <button key={v.id} onClick={() => handleSelectionChange('competitor', 
                            competitorSelection.includes(v.id) 
                                ? competitorSelection.filter(id => id !== v.id) 
                                : [...competitorSelection, v.id]
                        )} className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${competitorSelection.includes(v.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
                            {v.name}
                        </button>
                    ))}
                </div>
            )}
            {mode === 'brand' && <select value={brandSelection} onChange={e => handleSelectionChange('brand', e.target.value)} className="p-2 border rounded-lg bg-gray-50">{brands.map(b => <option key={b} value={b}>{b}</option>)}</select>}
            {mode === 'evolution' && <select value={evolutionSelection} onChange={e => handleSelectionChange('evolution', e.target.value)} className="p-2 border rounded-lg bg-gray-50">{uniqueModels.map(m => <option key={m} value={m}>{m}</option>)}</select>}
            {mode === 'tech' && <select value={techSelection} onChange={e => handleSelectionChange('tech', e.target.value)} className="p-2 border rounded-lg bg-gray-50">{techOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select>}
            {mode === 'supply_chain' && (
                <div className="flex items-center gap-4">
                    <select value={supplyChainSelection.type} onChange={e => handleSelectionChange('supply_chain_type', e.target.value)} className="p-2 border rounded-lg bg-gray-50">
                        <option value="supplier">供应商</option>
                        <option value="platform">整车平台</option>
                    </select>
                    <select value={supplyChainSelection.value} onChange={e => handleSelectionChange('supply_chain_value', e.target.value)} className="p-2 border rounded-lg bg-gray-50 flex-grow">
                        <option value="">请选择...</option>
                        {(supplyChainSelection.type === 'supplier' ? mockSuppliers : mockPlatforms).map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                </div>
            )}
        </div>
    );
    
    const renderComparisonView = () => (
         <div className="pb-4 overflow-x-auto">
            <div className="flex gap-4">
                {displayedVehicles.map(vehicle => (
                    <VehicleSpecCard key={vehicle.id} vehicle={vehicle} highlightedSpecs={highlightedSpecs} />
                ))}
            </div>
        </div>
    );

    const renderContent = () => {
        if (mode === 'forecast') {
            return <ForecastView />;
        }
        return renderComparisonView();
    };

    return (
        <div className="p-4 sm:p-6 bg-gray-50/50 min-h-full">
            <header className="mb-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-900">技术看板</h1>
                </div>
                <p className="mt-1 text-gray-600">从多维度洞察和比较汽车行业的技术格局。</p>
            </header>

            <div className="mb-6 bg-white p-1.5 rounded-xl border inline-flex items-center gap-1.5 shadow-sm">
                 {modeOptions.map(({ key, ...rest }) => (
                    <ModeTab key={key} m_key={key} {...rest} isActive={mode === key} onClick={() => handleModeChange(key)} />
                ))}
            </div>

            {mode !== 'forecast' && renderControls()}
            
            <main>
                {renderContent()}
            </main>
        </div>
    );
};
import React, { useState, useMemo, useEffect, ReactNode } from 'react';
import { VehicleTechSpec, SpecDetail, ComparisonMode, NewTechForecast } from '../../types';
import { techDimensions, mockVehicleSpecs, mockSuppliers, mockPlatforms, mockTechForecasts } from '../../mockData';
import { ChevronDownIcon, UsersIcon, EyeIcon, TrendingUpIcon, LightBulbIcon, GearIcon, BrainIcon, CloseIcon } from '../icons';


// --- Helper Functions ---
const getSpecDisplay = (spec: string | SpecDetail | null): ReactNode => {
    if (!spec) return <span className="text-gray-400">N/A</span>;
    if (typeof spec === 'string') return spec;
    return (
        <div>
            <span>{spec.value}</span>
            {spec.supplier && <span className="block text-xs text-gray-500">{spec.supplier}</span>}
        </div>
    );
};

const getSpecValue = (spec: string | SpecDetail | null): string => {
    if (!spec) return 'N/A';
    if (typeof spec === 'string') return spec;
    return spec.value;
};

const getDifferences = (comparisonData: VehicleTechSpec[], catKey: string, subKey: string): boolean => {
    if (comparisonData.length <= 1) return false;
    const firstValue = getSpecValue(comparisonData[0]?.specs[catKey]?.[subKey]);
    return comparisonData.slice(1).some(vehicle => getSpecValue(vehicle.specs[catKey]?.[subKey]) !== firstValue);
};

// --- Sub-Components ---
const ModeTab: React.FC<{
    label: string;
    icon: React.FC<any>;
    isActive: boolean;
    onClick: () => void;
}> = ({ label, icon: Icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-1 flex flex-col items-center gap-1.5 py-2 px-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
            isActive ? 'bg-white text-blue-600 shadow-md' : 'text-gray-600 hover:bg-gray-100'
        }`}
    >
        <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
        <span>{label}</span>
    </button>
);

const ForecastCell: React.FC<{ forecast: NewTechForecast; onSourceClick: () => void }> = ({ forecast, onSourceClick }) => {
    const confidenceColor = forecast.confidence > 0.8 ? 'bg-green-500' : forecast.confidence > 0.5 ? 'bg-yellow-500' : 'bg-red-500';
    const statusInfo = forecast.status === 'confirmed' 
        ? { text: '已证实', color: 'bg-green-100 text-green-800' }
        : { text: '传闻中', color: 'bg-yellow-100 text-yellow-800' };

    return (
        <div className="p-2 space-y-2">
            <p className="font-semibold text-gray-800 text-sm">{forecast.techName}</p>
            <div>
                <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs text-gray-500">可信度</span>
                    <span className={`text-xs font-bold ${statusInfo.color} px-1.5 py-0.5 rounded-full`}>{statusInfo.text}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className={confidenceColor} style={{ width: `${forecast.confidence * 100}%`, height: '100%', borderRadius: 'inherit' }}></div>
                </div>
            </div>
            <button onClick={onSourceClick} className="text-xs text-blue-600 hover:underline font-semibold">
                溯源
            </button>
        </div>
    );
};

const SourceModal: React.FC<{ forecast: NewTechForecast; onClose: () => void }> = ({ forecast, onClose }) => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
            <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">情报来源</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><CloseIcon className="w-6 h-6" /></button>
            </div>
            <div className="p-6">
                <p className="text-sm text-gray-600 mb-2">以下信息支撑了对 <strong className="text-gray-800">{forecast.brand} {forecast.model}</strong> 的 <strong className="text-gray-800">"{forecast.techName}"</strong> 技术预测：</p>
                <div className="bg-gray-50 border p-4 rounded-lg">
                    <p className="font-semibold text-gray-800">{forecast.sourceArticle}</p>
                    <a href={forecast.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
                        查看原文 &rarr;
                    </a>
                </div>
            </div>
        </div>
    </div>
);


// --- Main Component ---
export const TechDashboard: React.FC = () => {
    const [mode, setMode] = useState<ComparisonMode>('competitor');
    const [selections, setSelections] = useState<Record<string, any>>({
        item0: 'xiaomi-su7-max',
        item1: 'tesla-model3-2024',
        item2: 'li-l7-2024',
    });
    const [comparisonData, setComparisonData] = useState<VehicleTechSpec[]>([]);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(techDimensions.map(c => c.key)));
    
    // State for Forecast mode
    const [forecastFilters, setForecastFilters] = useState<Record<string, boolean>>({});
    const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());
    const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
    const [selectedForecastForSource, setSelectedForecastForSource] = useState<NewTechForecast | null>(null);

    const uniqueBrands = useMemo(() => Array.from(new Set(mockVehicleSpecs.map(v => v.brand))), []);
    const uniqueModels = useMemo(() => Array.from(new Set(mockVehicleSpecs.map(v => v.model))), []);
    const forecastBrands = useMemo(() => Array.from(new Set(mockTechForecasts.map(f => f.brand))), []);

    // --- Data Processing Logic ---
    useEffect(() => {
        let data: VehicleTechSpec[] = [];
        // This effect handles data for the original 5 modes
        if (mode !== 'forecast') {
            switch (mode) {
                case 'competitor':
                    data = Object.values(selections)
                        .map(id => mockVehicleSpecs.find(v => v.id === id))
                        .filter(Boolean) as VehicleTechSpec[];
                    break;
                case 'brand':
                    data = mockVehicleSpecs.filter(v => v.brand === selections.brand);
                    break;
                case 'evolution':
                    data = mockVehicleSpecs.filter(v => v.model === selections.model).sort((a, b) => a.year - b.year);
                    break;
                case 'tech':
                    if (selections.tech) {
                        const [catKey, subKey] = selections.tech.split('.');
                        data = mockVehicleSpecs.filter(v => v.specs[catKey]?.[subKey]);
                    }
                    break;
                case 'supply_chain':
                    if (selections.type === 'supplier' && selections.value) {
                        data = mockVehicleSpecs.filter(v => 
                            Object.values(v.specs).some(cat => 
                                Object.values(cat).some(spec => typeof spec === 'object' && spec?.supplier === selections.value)
                            )
                        );
                    } else if (selections.type === 'platform' && selections.value) {
                        data = mockVehicleSpecs.filter(v => v.platform === selections.value);
                    }
                    break;
            }
            setComparisonData(data);
        }
    }, [selections, mode]);

    const groupedForecasts = useMemo(() => {
        const enabledBrands = Object.entries(forecastFilters).filter(([_, v]) => v).map(([k, _]) => k);
        const filtered = enabledBrands.length > 0 ? mockTechForecasts.filter(f => enabledBrands.includes(f.brand)) : mockTechForecasts;

        return filtered.reduce((acc, forecast) => {
            if (!acc[forecast.brand]) acc[forecast.brand] = {};
            if (!acc[forecast.brand][forecast.model]) acc[forecast.brand][forecast.model] = [];
            acc[forecast.brand][forecast.model].push(forecast);
            return acc;
        }, {} as Record<string, Record<string, NewTechForecast[]>>);
    }, [forecastFilters]);
    
    // --- UI State Management ---
    useEffect(() => {
        // Initialize forecast filters
        const initialFilters: Record<string, boolean> = {};
        forecastBrands.forEach(brand => initialFilters[brand] = true);
        setForecastFilters(initialFilters);
        setExpandedBrands(new Set(forecastBrands));
    }, []); // Run once on mount

    const handleModeChange = (newMode: ComparisonMode) => {
        setMode(newMode);
        switch (newMode) {
            case 'competitor': setSelections({ item0: 'xiaomi-su7-max', item1: 'tesla-model3-2024', item2: 'li-l7-2024' }); break;
            case 'brand': setSelections({ brand: uniqueBrands[0] || '' }); break;
            case 'evolution': setSelections({ model: 'M7' }); break;
            case 'tech': setSelections({ tech: 'power.platform' }); break;
            case 'supply_chain': setSelections({ type: 'supplier', value: mockSuppliers[0] || '' }); break;
            case 'forecast': setSelections({}); break;
        }
    };
    
    const toggleCategory = (key: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) newSet.delete(key); else newSet.add(key);
            return newSet;
        });
    };
    
    const toggleBrandExpansion = (brand: string) => {
        setExpandedBrands(prev => {
            const newSet = new Set(prev);
            if (newSet.has(brand)) newSet.delete(brand); else newSet.add(brand);
            return newSet;
        });
    };

    const handleForecastFilterChange = (brand: string) => {
        setForecastFilters(prev => ({...prev, [brand]: !prev[brand]}));
    };
    
    const handleOpenSourceModal = (forecast: NewTechForecast) => {
        setSelectedForecastForSource(forecast);
        setIsSourceModalOpen(true);
    };

    // --- Render Functions ---
    const renderControls = () => {
        // ... (existing control rendering logic)
        switch (mode) {
            case 'forecast':
                 return (
                    <div className="flex items-center gap-4">
                        <span className="font-semibold text-sm text-gray-700">筛选车企:</span>
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                            {forecastBrands.map(brand => (
                                <label key={brand} className="flex items-center space-x-2 cursor-pointer">
                                    <input type="checkbox" checked={forecastFilters[brand] || false} onChange={() => handleForecastFilterChange(brand)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                                    <span className="text-sm text-gray-800">{brand}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                );
            default:
                 const handleSelectChange = (key: string, value: string) => {
                    setSelections(prev => ({...prev, [key]: value}));
                };
                
                switch (mode) {
                    case 'competitor':
                        return (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[0, 1, 2].map(i => (
                                    <select key={i} value={selections[`item${i}`] || ''} onChange={e => handleSelectChange(`item${i}`, e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        {mockVehicleSpecs.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </select>
                                ))}
                            </div>
                        );
                    case 'brand':
                         return <select value={selections.brand} onChange={e => handleSelectChange('brand', e.target.value)} className="w-full max-w-xs bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                             {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
                         </select>;
                    case 'evolution':
                        return <select value={selections.model} onChange={e => handleSelectChange('model', e.target.value)} className="w-full max-w-xs bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            {uniqueModels.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>;
                    case 'tech':
                        return <select value={selections.tech} onChange={e => handleSelectChange('tech', e.target.value)} className="w-full max-w-xs bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            {techDimensions.map(cat => (
                                <optgroup key={cat.key} label={cat.label}>
                                    {cat.subDimensions.map(sub => <option key={`${cat.key}.${sub.key}`} value={`${cat.key}.${sub.key}`}>{sub.label}</option>)}
                                </optgroup>
                            ))}
                         </select>;
                    case 'supply_chain':
                        return (
                            <div className="flex gap-4">
                                <select value={selections.type} onChange={e => setSelections({ type: e.target.value, value: '' })} className="bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="supplier">供应商</option>
                                    <option value="platform">整车平台</option>
                                </select>
                                <select value={selections.value} onChange={e => handleSelectChange('value', e.target.value)} className="w-full max-w-xs bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">-- 请选择 --</option>
                                    {(selections.type === 'supplier' ? mockSuppliers : mockPlatforms).map(item => <option key={item} value={item}>{item}</option>)}
                                </select>
                            </div>
                        );
                }
        }
    };
    
    const renderTable = () => {
        if (mode === 'forecast') {
            return (
                 <table className="w-full min-w-[1000px] border-collapse text-sm">
                    <thead className="sticky top-0 z-10">
                        <tr className="border-b bg-gray-50">
                            <th className="w-48 p-3 text-left font-semibold text-gray-600">车企/车型</th>
                            {techDimensions.map(dim => <th key={dim.key} className="p-3 text-left font-semibold text-gray-600">{dim.label}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(groupedForecasts).map(([brand, models]) => (
                            <React.Fragment key={brand}>
                                <tr className="border-b bg-gray-50/70 hover:bg-gray-100 cursor-pointer" onClick={() => toggleBrandExpansion(brand)}>
                                    <td className="p-3 font-semibold text-gray-800 flex items-center gap-2">
                                         <ChevronDownIcon className={`w-4 h-4 transition-transform ${expandedBrands.has(brand) ? 'rotate-0' : '-rotate-90'}`} />
                                         {brand}
                                    </td>
                                    <td colSpan={techDimensions.length}></td>
                                </tr>
                                {expandedBrands.has(brand) && Object.entries(models).map(([model, forecasts]) => (
                                    <tr key={model} className="border-b">
                                        <td className="p-3 pl-10 font-medium text-gray-700">{model}</td>
                                        {techDimensions.map(dim => {
                                            const forecast = forecasts.find(f => f.techDimensionKey === dim.key);
                                            return (
                                                <td key={dim.key} className="p-1 align-top">
                                                    {forecast ? <ForecastCell forecast={forecast} onSourceClick={() => handleOpenSourceModal(forecast)} /> : <div className="p-2 text-center text-gray-300">-</div>}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                 </table>
            )
        }
        
        if (comparisonData.length === 0) {
            return <div className="p-10 text-center text-gray-500">请选择有效的对比项。</div>
        }
        
        if (mode === 'tech' && selections.tech) {
            const [catKey, subKey] = selections.tech.split('.');
            const firstCarWithDetails = comparisonData.find(c => typeof c.specs[catKey]?.[subKey] === 'object' && (c.specs[catKey]?.[subKey] as SpecDetail)?.details);
            const detailKeys = firstCarWithDetails ? Object.keys(((firstCarWithDetails.specs[catKey]?.[subKey] as SpecDetail)?.details) || {}) : [];
            const subDimLabel = techDimensions.find(c => c.key === catKey)?.subDimensions.find(s => s.key === subKey)?.label;

            return (
                 <table className="w-full min-w-[800px] border-collapse text-sm">
                    <thead>
                        <tr className="border-b bg-gray-50 sticky top-0">
                            <th className="w-1/4 p-3 text-left font-semibold text-gray-600">{subDimLabel} - 详细参数</th>
                             {comparisonData.map(v => <th key={v.id} className="w-1/4 p-3 text-left font-semibold text-gray-800">{v.name}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                         <tr className="border-b bg-gray-50/70">
                            <td className="p-3 pl-4 font-semibold text-gray-800">核心型号</td>
                            {comparisonData.map(v => <td key={v.id} className="p-3 font-medium text-gray-900">{getSpecDisplay(v.specs[catKey]?.[subKey])}</td>)}
                         </tr>
                        {detailKeys.map(dKey => (
                             <tr key={dKey} className="border-b hover:bg-gray-50">
                                <td className="p-3 pl-8 text-gray-600">{dKey}</td>
                                {comparisonData.map(v => {
                                    const spec = v.specs[catKey]?.[subKey] as SpecDetail | null;
                                    return <td key={v.id} className="p-3 font-medium text-gray-900">{spec?.details?.[dKey] || 'N/A'}</td>
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )
        }

        return (
            <table className="w-full min-w-[1000px] border-collapse text-sm">
                <thead className="sticky top-0 z-10">
                    <tr className="border-b bg-gray-50">
                        <th className="w-1/4 p-3 text-left font-semibold text-gray-600">技术维度</th>
                        {comparisonData.map(v => <th key={v.id} className="w-1/4 p-3 text-left font-semibold text-gray-800">{v.name}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {techDimensions.map(cat => (
                        <React.Fragment key={cat.key}>
                            <tr className="border-b bg-gray-50/70 sticky top-10 cursor-pointer" onClick={() => toggleCategory(cat.key)}>
                                <td colSpan={comparisonData.length + 1} className="p-2 pl-3 font-semibold text-gray-800 flex items-center gap-2">
                                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${expandedCategories.has(cat.key) ? 'rotate-0' : '-rotate-90'}`} />
                                    {cat.label}
                                </td>
                            </tr>
                            {expandedCategories.has(cat.key) && cat.subDimensions.map(sub => {
                                const isDifferent = getDifferences(comparisonData, cat.key, sub.key);
                                return (
                                    <tr key={sub.key} className="border-b hover:bg-gray-50">
                                        <td className="p-3 pl-8 text-gray-600">{sub.label}</td>
                                        {comparisonData.map(v => (
                                            <td key={v.id} className={`p-3 font-medium align-top ${isDifferent ? 'bg-amber-50/60' : ''}`}>
                                                {getSpecDisplay(v.specs[cat.key]?.[sub.key])}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        );
    };

    return (
        <>
            <div className="h-full flex flex-col bg-gray-100 p-6">
                <header className="flex-shrink-0 bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
                    <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl mb-4">
                        <ModeTab label="新技术预测" icon={BrainIcon} isActive={mode === 'forecast'} onClick={() => handleModeChange('forecast')} />
                        <ModeTab label="竞品对位" icon={EyeIcon} isActive={mode === 'competitor'} onClick={() => handleModeChange('competitor')} />
                        <ModeTab label="产品梯队" icon={TrendingUpIcon} isActive={mode === 'brand'} onClick={() => handleModeChange('brand')} />
                        <ModeTab label="车型演进" icon={LightBulbIcon} isActive={mode === 'evolution'} onClick={() => handleModeChange('evolution')} />
                        <ModeTab label="技术专题" icon={GearIcon} isActive={mode === 'tech'} onClick={() => handleModeChange('tech')} />
                        <ModeTab label="供应链/平台" icon={UsersIcon} isActive={mode === 'supply_chain'} onClick={() => handleModeChange('supply_chain')} />
                    </div>
                    <div>{renderControls()}</div>
                </header>

                <main className="flex-1 overflow-auto bg-white rounded-xl border border-gray-200 shadow-sm relative">
                    {renderTable()}
                </main>
            </div>
            {isSourceModalOpen && selectedForecastForSource && (
                <SourceModal 
                    forecast={selectedForecastForSource}
                    onClose={() => setIsSourceModalOpen(false)}
                />
            )}
        </>
    );
};
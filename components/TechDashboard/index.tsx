import React, { useState, useMemo, useEffect, ReactNode } from 'react';
import { VehicleTechSpec, SpecDetail, ComparisonMode, NewTechForecast } from '../../types';
import { techDimensions, mockVehicleSpecs, mockSuppliers, mockPlatforms, mockTechForecasts, mockAIAnalyses, mockTechDimensionAnalyses, mockBrandAnalyses } from './data';
import { ChevronDownIcon, UsersIcon, EyeIcon, TrendingUpIcon, LightBulbIcon, GearIcon, BrainIcon, CloseIcon, PlusIcon, DocumentTextIcon, CheckIcon, ClockIcon, QuestionMarkCircleIcon, ChevronUpDownIcon, SparklesIcon } from '../icons';

// --- Helper Functions ---
const getSpecDisplay = (spec: string | SpecDetail | null): ReactNode => {
    if (!spec) return <span className="text-gray-400">--</span>;
    if (typeof spec === 'string') return spec;
    return (
        <div className="text-right">
            <span className="font-semibold text-gray-800">{spec.value}</span>
            {spec.supplier && <span className="block text-xs text-gray-500 mt-0.5">{spec.supplier}</span>}
        </div>
    );
};

const getSpecValue = (spec: string | SpecDetail | null): string => {
    if (!spec) return 'N/A';
    if (typeof spec === 'string') return spec;
    return spec.value;
};

const getStatusChipStyle = (status: 'confirmed' | 'rumored') => {
    return status === 'confirmed'
        ? { text: '已证实', icon: CheckIcon, className: 'text-green-800' }
        : { text: '传闻中', icon: QuestionMarkCircleIcon, className: 'text-amber-800' };
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
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
            isActive ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'
        }`}
    >
        <Icon className="w-5 h-5" />
        <span>{label}</span>
    </button>
);

const ForecastChip: React.FC<{ forecast: NewTechForecast; onSourceClick: () => void }> = ({ forecast, onSourceClick }) => {
    const statusInfo = getStatusChipStyle(forecast.status);
    const tagBaseStyle = "px-2 py-1 bg-white/60 backdrop-blur-sm border border-black/10 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm";

    return (
        <div className="relative rounded-xl border border-gray-200/80 shadow-sm overflow-hidden bg-slate-200 group transition-all duration-300 hover:shadow-md h-full">
            {/* Gradient Background Progress */}
            <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-300 to-blue-600"
                style={{ width: `${forecast.confidence * 100}%` }}
            ></div>
            
            {/* Content Layer */}
            <div className="relative h-full flex flex-col justify-between p-2.5">
                {/* Title */}
                <p className="font-bold text-gray-900 text-sm leading-tight [text-shadow:0_1px_1px_rgba(255,255,255,0.8)]">
                    {forecast.techName}
                </p>
                
                {/* Tags Row */}
                <div className="flex items-center justify-between gap-1.5">
                    {/* Left Tags */}
                    <div className="flex items-center gap-1.5">
                         <span className={`${tagBaseStyle} ${statusInfo.className}`}>
                             <statusInfo.icon className="w-3.5 h-3.5" />
                             {statusInfo.text}
                         </span>
                         <div 
                            className={`${tagBaseStyle} text-gray-700`}
                            title={`首次披露: ${forecast.firstDisclosedAt}\n最新更新: ${forecast.lastUpdatedAt}`}
                         >
                            <ClockIcon className="w-3.5 h-3.5" />
                            <span>{forecast.lastUpdatedAt}</span>
                        </div>
                    </div>
                    
                    {/* Right Tag (Button) */}
                    <button 
                        onClick={onSourceClick} 
                        className={`${tagBaseStyle} text-gray-700 hover:bg-white/90 hover:text-blue-600 transition-colors`}
                    >
                        <DocumentTextIcon className="w-3.5 h-3.5"/>
                        <span>信源</span>
                    </button>
                </div>
            </div>
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

const ComparisonColumn: React.FC<{ vehicle: VehicleTechSpec, diffs: Set<string> }> = ({ vehicle, diffs }) => {
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(techDimensions.map(c => c.key)));
    const toggleCategory = (key: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) newSet.delete(key); else newSet.add(key);
            return newSet;
        });
    };

    return (
        <div className="flex-shrink-0 w-80 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50/80 backdrop-blur-sm sticky top-0 z-10">
                <h3 className="font-bold text-lg text-gray-900">{vehicle.name}</h3>
                <p className="text-sm text-gray-500">{vehicle.platform}</p>
            </div>
            <div className="flex-1 overflow-y-auto">
                {techDimensions.map(cat => (
                    <div key={cat.key} className="border-b border-gray-200 last:border-b-0">
                        <button onClick={() => toggleCategory(cat.key)} className="w-full flex justify-between items-center p-3 font-semibold text-gray-700 hover:bg-gray-100/70">
                            <span>{cat.label}</span>
                            <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform ${expandedCategories.has(cat.key) ? 'rotate-180' : ''}`} />
                        </button>
                        {expandedCategories.has(cat.key) && (
                            <div className="divide-y divide-gray-100">
                                {cat.subDimensions.map(sub => {
                                    const isDifferent = diffs.has(`${cat.key}.${sub.key}`);
                                    return (
                                        <div key={sub.key} className={`flex justify-between items-start text-sm p-3 transition-colors ${isDifferent ? 'bg-amber-50' : 'hover:bg-gray-50'}`}>
                                            <span className="text-gray-600 flex-1">{sub.label}</span>
                                            <div className="flex-1">{getSpecDisplay(vehicle.specs[cat.key]?.[sub.key])}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};


// --- Main Component ---
export const TechDashboard: React.FC = () => {
    const [mode, setMode] = useState<ComparisonMode>('forecast');
    const [selections, setSelections] = useState<Record<string, any>>({});
    const [comparisonData, setComparisonData] = useState<VehicleTechSpec[]>([]);
    const [differences, setDifferences] = useState<Set<string>>(new Set());
    
    const [forecastFilters, setForecastFilters] = useState<Record<string, boolean>>({});
    const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());
    const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
    const [selectedForecastForSource, setSelectedForecastForSource] = useState<NewTechForecast | null>(null);

    const uniqueBrands = useMemo(() => Array.from(new Set(mockVehicleSpecs.map(v => v.brand))), []);
    const uniqueModels = useMemo(() => Array.from(new Set(mockVehicleSpecs.map(v => v.model))), []);
    const forecastBrands = useMemo(() => Array.from(new Set(mockTechForecasts.map(f => f.brand))), []);

    const modes: { key: ComparisonMode, label: string, icon: React.FC<any> }[] = [
        { key: 'forecast', label: '新技术预测', icon: BrainIcon },
        { key: 'competitor', label: '竞品对位', icon: EyeIcon },
        { key: 'brand', label: '产品梯队', icon: TrendingUpIcon },
        { key: 'evolution', label: '车型演进', icon: LightBulbIcon },
        { key: 'tech', label: '技术专题', icon: GearIcon },
        { key: 'supply_chain', label: '供应链/平台', icon: UsersIcon },
    ];

    useEffect(() => {
        let data: VehicleTechSpec[] = [];
        if (mode !== 'forecast') {
             switch (mode) {
                case 'competitor':
                    data = Object.values(selections)
                        .map(id => mockVehicleSpecs.find(v => v.id === id))
                        .filter(Boolean) as VehicleTechSpec[];
                    break;
                case 'brand':
                    data = (selections.models || []).map((id:string) => mockVehicleSpecs.find(v => v.id === id)).filter(Boolean);
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

            const diffSet = new Set<string>();
            if (data.length > 1) {
                techDimensions.forEach(cat => {
                    cat.subDimensions.forEach(sub => {
                        const firstValue = getSpecValue(data[0].specs[cat.key]?.[sub.key]);
                        for (let i = 1; i < data.length; i++) {
                            if (getSpecValue(data[i].specs[cat.key]?.[sub.key]) !== firstValue) {
                                diffSet.add(`${cat.key}.${sub.key}`);
                                break;
                            }
                        }
                    });
                });
            }
            setDifferences(diffSet);
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
    
    useEffect(() => {
        const initialFilters: Record<string, boolean> = {};
        forecastBrands.forEach(brand => initialFilters[brand] = true);
        setForecastFilters(initialFilters);
        setExpandedBrands(new Set(forecastBrands));
    }, [forecastBrands]);

    const handleModeChange = (newMode: ComparisonMode) => {
        setMode(newMode);
        switch (newMode) {
            case 'competitor': setSelections({ item0: 'xiaomi-su7-max', item1: 'tesla-model3-2024' }); break;
            case 'brand': setSelections({ brand: '理想', models: ['li-l7-2024', 'li-l9-2024'] }); break;
            case 'evolution': setSelections({ model: 'M7' }); break;
            case 'tech': setSelections({ tech: 'power.platform' }); break;
            case 'supply_chain': setSelections({ type: 'supplier', value: 'NVIDIA' }); break;
            case 'forecast': setSelections({}); break;
        }
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

    const renderControls = () => {
        const handleSelectChange = (key: string, value: any) => {
            setSelections(prev => ({...prev, [key]: value}));
        };

        switch (mode) {
            case 'competitor':
                return (
                    <div className="flex items-center gap-2">
                        {Object.keys(selections).map((key, i) => (
// FIX: Added explicit event typing to resolve 'e.target.value' error.
                             <select key={key} value={selections[key] || ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleSelectChange(key, e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                {mockVehicleSpecs.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                             </select>
                        ))}
                         <button onClick={() => handleSelectChange(`item${Object.keys(selections).length}`, mockVehicleSpecs[0].id)} className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300"><PlusIcon className="w-5 h-5 text-gray-600" /></button>
                    </div>
                );
            case 'brand':
                const modelsOfBrand = mockVehicleSpecs.filter(v => v.brand === selections.brand);
                return (
                    <div className="flex gap-4">
                        {/* FIX: Added explicit event typing to resolve 'e.target.value' error. */}
                        <select value={selections.brand} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelections({ brand: e.target.value, models: []})} className="bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                        {/* FIX: Added explicit event typing to resolve 'e.target' error. */}
                         {/* FIX: Explicitly type the 'option' parameter in Array.from to resolve type inference issue. */}
                         <select multiple value={selections.models} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleSelectChange('models', Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value))} className="w-full max-w-md bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            {modelsOfBrand.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                    </div>
                );
            case 'evolution':
                {/* FIX: Added explicit event typing to resolve 'e.target.value' error. */}
                return <select value={selections.model} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleSelectChange('model', e.target.value)} className="w-full max-w-xs bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {uniqueModels.map(m => <option key={m} value={m}>{m}</option>)}
                </select>;
            case 'tech':
                {/* FIX: Added explicit event typing to resolve 'e.target.value' error. */}
                return <select value={selections.tech} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleSelectChange('tech', e.target.value)} className="w-full max-w-xs bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {techDimensions.map(cat => (
                        <optgroup key={cat.key} label={cat.label}>
                            {cat.subDimensions.map(sub => <option key={`${cat.key}.${sub.key}`} value={`${cat.key}.${sub.key}`}>{sub.label}</option>)}
                        </optgroup>
                    ))}
                    </select>;
            case 'supply_chain':
                return (
                    <div className="flex gap-4">
                        {/* FIX: Explicitly type event object to ensure e.target is correctly inferred. */}
                        <select value={selections.type || 'supplier'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelections({ type: e.target.value, value: '' })} className="bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="supplier">供应商</option>
                            <option value="platform">整车平台</option>
                        </select>
                        {/* FIX: Explicitly type event object to ensure e.target is correctly inferred. */}
                        <select value={selections.value || ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleSelectChange('value', e.target.value)} className="w-full max-w-xs bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">-- 请选择 --</option>
                            {(selections.type === 'supplier' ? mockSuppliers : mockPlatforms).map(item => <option key={item} value={item}>{item}</option>)}
                        </select>
                    </div>
                );
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
        }
    };
    
    const renderContent = () => {
        if (mode === 'forecast') {
            return (
                <div className="overflow-auto p-4 space-y-4">
                    <div className="grid grid-cols-[240px_repeat(6,minmax(200px,1fr))] gap-px bg-gray-200 border border-gray-200 sticky top-0 z-10">
                         <div className="p-3 text-left font-semibold text-gray-600 bg-gray-50/80 backdrop-blur-sm">车型</div>
                         {techDimensions.map(dim => <div key={dim.key} className="p-3 text-left font-semibold text-gray-600 bg-gray-50/80 backdrop-blur-sm">{dim.label}</div>)}
                    </div>
                    {Object.entries(groupedForecasts).map(([brand, models]) => (
                        <div key={brand} className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
                            <button onClick={() => toggleBrandExpansion(brand)} className="w-full flex justify-between items-center p-4 bg-gray-50/50 hover:bg-gray-100/70">
                                <h3 className="font-bold text-lg text-gray-900">{brand}</h3>
                                <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform ${expandedBrands.has(brand) ? 'rotate-180' : ''}`} />
                            </button>
                            {expandedBrands.has(brand) && (
                                <div>
                                    {mockBrandAnalyses[brand] && (
                                        <div className="p-4">
                                            <div className="bg-slate-100 border border-slate-200 rounded-xl p-4">
                                                <h4 className="font-bold text-base text-slate-800 flex items-center gap-2 mb-2">
                                                    <BrainIcon className="w-5 h-5 text-slate-500" />
                                                    AI 品牌战略洞察
                                                </h4>
                                                <p className="text-sm text-slate-600 leading-relaxed">{mockBrandAnalyses[brand]}</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="divide-y divide-gray-100">
                                        {Object.entries(models).map(([model, forecasts]) => (
                                            <div key={model} className="grid grid-cols-[240px_repeat(6,minmax(200px,1fr))] items-stretch">
                                                <div className="p-4 border-r border-gray-100 flex flex-col justify-start">
                                                    <div className='flex-1'>
                                                        <h4 className="font-semibold text-gray-800 text-xl">{model}</h4>
                                                        {mockAIAnalyses[model] && (
                                                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                                <h5 className="font-semibold text-sm text-blue-800 flex items-center gap-1.5 mb-2">
                                                                    <LightBulbIcon className="w-4 h-4 text-blue-500" />
                                                                    AI一句话点评
                                                                </h5>
                                                                <p className="text-xs text-blue-700 leading-relaxed">{mockAIAnalyses[model]}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {techDimensions.map(dim => {
                                                    const forecastsForCell = forecasts.filter(f => f.techDimensionKey === dim.key);
                                                    const dimensionSummary = mockTechDimensionAnalyses[`${brand.toLowerCase()}-${dim.key}`];
                                                    return (
                                                        <div key={dim.key} className="p-2 border-r border-gray-100 last:border-r-0 h-full">
                                                            <div className="flex flex-col gap-2 h-full">
                                                                {dimensionSummary && (
                                                                    <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg">
                                                                        <p className="text-xs text-purple-800 leading-relaxed flex items-start gap-1.5">
                                                                            <SparklesIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-purple-500" />
                                                                            <span>{dimensionSummary}</span>
                                                                        </p>
                                                                    </div>
                                                                )}
                                                                {forecastsForCell.map(forecast => (
                                                                    <ForecastChip key={forecast.id} forecast={forecast} onSourceClick={() => handleOpenSourceModal(forecast)} />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            );
        }
        
        if (comparisonData.length === 0) {
            return <div className="p-10 text-center text-gray-500">请在上方选择有效的对比项。</div>
        }

        return (
            <div className="flex-1 overflow-x-auto p-4">
                <div className="inline-flex gap-4 pb-4">
                    {comparisonData.map(vehicle => (
                        <ComparisonColumn key={vehicle.id} vehicle={vehicle} diffs={differences} />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="h-full flex flex-col bg-slate-100 p-4 sm:p-6 gap-4 sm:gap-6">
                <header className="flex-shrink-0 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl">
                        {modes.map(({ key, ...modeProps }) => (
                            <ModeTab key={key} {...modeProps} isActive={mode === key} onClick={() => handleModeChange(key)} />
                        ))}
                    </div>
                    <div className="min-h-[44px] flex items-center">{renderControls()}</div>
                </header>

                <main className="flex-1 flex flex-col overflow-hidden bg-white rounded-2xl border border-gray-200/80 shadow-sm">
                    {renderContent()}
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
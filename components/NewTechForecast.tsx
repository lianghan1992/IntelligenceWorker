import React, { useState, useMemo, useEffect } from 'react';
import { TechPrediction, PredictionEvidence, PredictionStatus, User } from '../types';
import { mockTechPredictions, mockPredictionEvidence } from '../mockData';
import { ChevronDownIcon, CloseIcon, PlusIcon } from './icons';

// --- Helper Functions ---
const getConfidenceStyles = (score: number) => {
    if (score >= 90) return { bar: 'bg-green-500', text: 'text-green-700' };
    if (score >= 70) return { bar: 'bg-blue-500', text: 'text-blue-700' };
    if (score >= 50) return { bar: 'bg-yellow-500', text: 'text-yellow-700' };
    return { bar: 'bg-red-500', text: 'text-red-700' };
};

const getStatusStyles = (status: PredictionStatus) => {
    switch (status) {
        case '官方证实': return 'bg-green-100 text-green-800';
        case '基本确认': return 'bg-blue-100 text-blue-800';
        case '高概率': return 'bg-yellow-100 text-yellow-800';
        case '传闻': return 'bg-gray-100 text-gray-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

// --- Sub-Components ---
const AddVehicleModal: React.FC<{ onClose: () => void; onAdd: (name: string) => void; }> = ({ onClose, onAdd }) => {
    const [name, setName] = useState('');
    
    const handleAdd = () => {
        if (name.trim()) {
            onAdd(name.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">新增预测车型</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6">
                    <label htmlFor="vehicle-name" className="block text-sm font-medium text-gray-700 mb-1">车型名称</label>
                    <input
                        id="vehicle-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="例如：蔚来ET9"
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
                    <button onClick={handleAdd} disabled={!name.trim()} className="py-2 px-6 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:bg-blue-300">
                        确认新增
                    </button>
                </div>
            </div>
        </div>
    );
};


const EvidenceCard: React.FC<{ item: PredictionEvidence }> = ({ item }) => (
    <div className="bg-white p-4 rounded-lg border border-gray-200 relative animate-in fade-in-0 duration-300">
        <div className="absolute -left-2.5 top-5 w-5 h-5 bg-white border-2 border-blue-500 rounded-full"></div>
        <div className="pl-6">
            <p className="text-xs text-gray-500">{new Date(item.published_at).toLocaleString('zh-CN')}</p>
            <p className="font-semibold text-gray-800 my-1">{item.source_name}</p>
            <blockquote className="border-l-4 border-gray-200 pl-3 text-sm text-gray-600 my-2">"{item.source_quote}"</blockquote>
            <div className="flex justify-between items-center mt-2">
                 <a href={item.original_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 hover:underline">查看原文</a>
                 <span className="text-xs font-bold text-gray-500">初始置信度: {item.initial_confidence}%</span>
            </div>
        </div>
    </div>
);

// --- Main Component ---
interface NewTechForecastProps {
    user: User;
}

export const NewTechForecast: React.FC<NewTechForecastProps> = ({ user }) => {
    const initialVehicles = useMemo(() => Array.from(new Set(mockTechPredictions.map(p => p.vehicle_model))), []);
    const [vehicles, setVehicles] = useState<string[]>(initialVehicles);
    const [selectedVehicle, setSelectedVehicle] = useState(vehicles[0] || '');
    const [selectedPrediction, setSelectedPrediction] = useState<TechPrediction | null>(null);
    const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState(false);
    const [visibleEvidenceCount, setVisibleEvidenceCount] = useState(5);

    // 当车型列表变化时（例如新增），确保有选中的车型
    useEffect(() => {
        if (!selectedVehicle && vehicles.length > 0) {
            setSelectedVehicle(vehicles[0]);
        }
    }, [vehicles, selectedVehicle]);


    const predictionsByCategory = useMemo(() => {
        return mockTechPredictions
            .filter(p => p.vehicle_model === selectedVehicle)
            .reduce((acc, p) => {
                if (!acc[p.category]) acc[p.category] = [];
                acc[p.category].push(p);
                return acc;
            }, {} as Record<string, TechPrediction[]>);
    }, [selectedVehicle]);
    
    // 创建一个从证据ID到车型的映射，用于在右侧栏展示“全部情报”
    const evidenceToVehicleMap = useMemo(() => {
        const map = new Map<string, string>();
        mockTechPredictions.forEach(pred => {
            pred.supporting_evidence_ids.forEach(id => {
                map.set(id, pred.vehicle_model);
            });
        });
        return map;
    }, []);

    const evidenceToShow = useMemo(() => {
        let relevantEvidence: PredictionEvidence[];
        if (selectedPrediction) {
            // 模式2：显示与选中预测相关的证据
            const evidenceIds = new Set(selectedPrediction.supporting_evidence_ids);
            relevantEvidence = mockPredictionEvidence.filter(e => evidenceIds.has(e.evidence_id));
        } else {
            // 模式1：显示当前选中车型的所有证据
            relevantEvidence = mockPredictionEvidence.filter(e => evidenceToVehicleMap.get(e.evidence_id) === selectedVehicle);
        }
        return relevantEvidence.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
    }, [selectedVehicle, selectedPrediction, evidenceToVehicleMap]);

    const visibleEvidence = useMemo(() => evidenceToShow.slice(0, visibleEvidenceCount), [evidenceToShow, visibleEvidenceCount]);

    const handleAddVehicle = (name: string) => {
        if (!vehicles.includes(name)) {
            setVehicles(prev => [name, ...prev]);
        }
        setSelectedVehicle(name);
        setIsAddVehicleModalOpen(false);
    };

    const handleSelectVehicle = (vehicle: string) => {
        setSelectedVehicle(vehicle);
        setSelectedPrediction(null); // 切换车型时，清空选中的预测
        setVisibleEvidenceCount(5); // 重置懒加载计数
    };

    return (
        <div className="h-full bg-gray-50/70 flex overflow-hidden">
            {/* Left Column: Vehicle Selector */}
            <aside className="w-64 h-full overflow-y-auto bg-white border-r p-4 space-y-2 flex-shrink-0">
                <h2 className="text-sm font-semibold text-gray-500 px-2 uppercase tracking-wider mb-2">选择车型</h2>
                {/* 仅管理员可见的新增按钮。硬编码用户邮箱用于演示目的。 */}
                {user.email === '326575140@qq.com' && (
                    <button
                        onClick={() => setIsAddVehicleModalOpen(true)}
                        className="w-full text-left px-3 py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center gap-3 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-dashed border-blue-300"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span>新增车型</span>
                    </button>
                )}
                {vehicles.map((vehicle, index) => (
                    <div
                        key={vehicle}
                        onClick={() => handleSelectVehicle(vehicle)}
                        className={`w-full p-4 rounded-lg font-bold text-white transition-all duration-300 cursor-pointer relative overflow-hidden group h-20 flex flex-col justify-end ${
                            selectedVehicle === vehicle ? 'ring-2 ring-blue-500 shadow-lg' : ''
                        }`}
                        style={{
                            backgroundImage: `url('https://source.unsplash.com/random/400x200?car,night,${index}')`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10 group-hover:from-black/80 transition-all"></div>
                        <span className="relative z-10 text-lg">{vehicle}</span>
                    </div>
                ))}
            </aside>

            {/* Middle Column: Prediction Board */}
            <main className="flex-1 h-full overflow-y-auto p-6">
                 <h1 className="text-2xl font-bold text-gray-900 mb-4">{selectedVehicle} - 技术预测看板</h1>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {Object.entries(predictionsByCategory).map(([category, predictions]) => {
                        const totalEvidenceCount = new Set((predictions as TechPrediction[]).flatMap(p => p.supporting_evidence_ids)).size;
                        return (
                            <div key={category} className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
                                <div className="p-4 border-b">
                                    <h3 className="font-bold text-gray-800">{category}</h3>
                                    <p className="text-xs text-gray-500">{totalEvidenceCount} 条相关情报</p>
                                </div>
                                <div className="divide-y divide-gray-100 flex-1">
                                {(predictions as TechPrediction[]).map(p => {
                                    const confidence = getConfidenceStyles(p.confidence_score);
                                    const status = getStatusStyles(p.prediction_status);
                                    return (
                                        <div key={p.prediction_id} onClick={() => { setSelectedPrediction(p); setVisibleEvidenceCount(5); }} className={`p-4 hover:bg-blue-50 cursor-pointer transition-colors ${selectedPrediction?.prediction_id === p.prediction_id ? 'bg-blue-50' : ''}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-semibold text-gray-800">{p.sub_category}</h4>
                                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${status} flex-shrink-0`}>{p.prediction_status}</span>
                                            </div>
                                            <div className="flex justify-between items-baseline">
                                                <p className="text-lg font-bold text-blue-700">{p.current_prediction}</p>
                                                <span className="text-xs text-gray-500 font-medium">{p.supporting_evidence_ids.length}条证据</span>
                                            </div>
                                            <div className="mt-3">
                                                <div className="flex justify-between items-center mb-1 text-xs">
                                                    <span className="font-semibold text-gray-600">置信度</span>
                                                    <span className={`font-bold ${confidence.text}`}>{p.confidence_score}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div className={`${confidence.bar} h-2 rounded-full`} style={{ width: `${p.confidence_score}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Right Column: Raw Intelligence */}
             <aside className="w-1/3 max-w-lg h-full bg-white border-l flex flex-col flex-shrink-0">
                <div className="p-5 border-b flex-shrink-0">
                    <h3 className="text-lg font-bold text-gray-900">原始情报</h3>
                    <p className="text-sm text-gray-500 truncate">
                        {selectedPrediction 
                            ? `关于 “${selectedPrediction.sub_category}” 的 ${evidenceToShow.length} 条情报`
                            : `关于 “${selectedVehicle}” 的 ${evidenceToShow.length} 条情报`
                        }
                    </p>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/70">
                    {visibleEvidence.map((item, index) => (
                        <div key={item.evidence_id} className="relative">
                            <EvidenceCard item={item} />
                            {index < visibleEvidence.length - 1 && <div className="absolute -left-0.5 top-10 bottom-0 w-0.5 bg-blue-200"></div>}
                        </div>
                    ))}
                     {evidenceToShow.length === 0 && <p className="text-gray-500 text-center py-10">暂无相关情报。</p>}
                     {evidenceToShow.length > visibleEvidenceCount && (
                         <button onClick={() => setVisibleEvidenceCount(prev => prev + 5)} className="w-full py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors">
                             加载更多
                         </button>
                     )}
                </div>
            </aside>
            
            {isAddVehicleModalOpen && <AddVehicleModal onClose={() => setIsAddVehicleModalOpen(false)} onAdd={handleAddVehicle} />}
        </div>
    );
};
import React, { useState, useMemo } from 'react';
import { TechPrediction, PredictionEvidence, PredictionStatus } from '../types';
import { mockTechPredictions, mockPredictionEvidence } from '../mockData';
import { ChevronDownIcon, CloseIcon, ChevronRightIcon } from './icons';

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

const EvidenceSidebar: React.FC<{
    prediction: TechPrediction;
    onClose: () => void;
}> = ({ prediction, onClose }) => {
    const evidence = useMemo(() => {
        return mockPredictionEvidence
            .filter(e => prediction.supporting_evidence_ids.includes(e.evidence_id))
            .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
    }, [prediction]);

    return (
        <div className="absolute inset-0 bg-black/30 animate-in fade-in-0" onClick={onClose}>
            <div 
                className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-300"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-5 border-b flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{prediction.sub_category} - 溯源</h3>
                        <p className="text-sm text-gray-500">{prediction.vehicle_model}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50">
                    {evidence.map((item, index) => (
                        <div key={item.evidence_id} className="bg-white p-4 rounded-lg border border-gray-200 relative">
                             <div className="absolute -left-2.5 top-5 w-5 h-5 bg-white border-2 border-blue-500 rounded-full"></div>
                             {index < evidence.length - 1 && <div className="absolute -left-0.5 top-10 bottom-0 w-0.5 bg-blue-200"></div>}
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
                    ))}
                     {evidence.length === 0 && <p className="text-gray-500 text-center py-10">暂无外部证据支持该预测。</p>}
                </div>
            </div>
        </div>
    );
};

const Accordion: React.FC<{ title: string; count: number; children: React.ReactNode }> = ({ title, count, children }) => {
    const [isOpen, setIsOpen] = useState(true);
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-50">
                <div className="flex items-center gap-3">
                    <h3 className="font-bold text-gray-800">{title}</h3>
                    <span className="px-2 py-0.5 text-xs font-bold text-blue-800 bg-blue-100 rounded-full">{count} 项</span>
                </div>
                <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <div className="border-t border-gray-200">{children}</div>}
        </div>
    );
};

export const NewTechForecast: React.FC = () => {
    const [selectedVehicle, setSelectedVehicle] = useState('小米SU9');
    const [selectedPrediction, setSelectedPrediction] = useState<TechPrediction | null>(null);

    const vehicles = useMemo(() => Array.from(new Set(mockTechPredictions.map(p => p.vehicle_model))), []);

    const predictionsByCategory = useMemo(() => {
        return mockTechPredictions
            .filter(p => p.vehicle_model === selectedVehicle)
            .reduce((acc, p) => {
                if (!acc[p.category]) acc[p.category] = [];
                acc[p.category].push(p);
                return acc;
            }, {} as Record<string, TechPrediction[]>);
    }, [selectedVehicle]);

    return (
        <div className="h-full bg-gray-50/70 flex relative overflow-hidden">
            {/* Left Column: Vehicle Selector */}
            <aside className="w-1/5 h-full overflow-y-auto bg-white border-r p-4 space-y-2">
                <h2 className="text-sm font-semibold text-gray-500 px-2 uppercase tracking-wider">选择车型</h2>
                {vehicles.map(vehicle => (
                    <button
                        key={vehicle}
                        onClick={() => setSelectedVehicle(vehicle)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg font-semibold text-sm transition-colors flex justify-between items-center ${
                            selectedVehicle === vehicle
                                ? 'bg-blue-600 text-white shadow'
                                : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        <span>{vehicle}</span>
                        {selectedVehicle === vehicle && <ChevronRightIcon className="w-5 h-5"/>}
                    </button>
                ))}
            </aside>

            {/* Middle Column: Prediction Board */}
            <main className="w-3/5 h-full overflow-y-auto p-6 space-y-4">
                 <h1 className="text-2xl font-bold text-gray-900">{selectedVehicle} - 技术预测看板</h1>
                {Object.entries(predictionsByCategory).map(([category, predictionsUnknown]) => {
                    // FIX: Cast the value from Object.entries to the correct type to resolve TS errors.
                    // `predictionsUnknown` is inferred as `unknown`, so we assert it's `TechPrediction[]`.
                    const predictions = predictionsUnknown as TechPrediction[];
                    return (
                        <Accordion key={category} title={category} count={predictions.length}>
                            <div className="divide-y divide-gray-100">
                            {predictions.map(p => {
                                const confidence = getConfidenceStyles(p.confidence_score);
                                const status = getStatusStyles(p.prediction_status);
                                return (
                                    <div key={p.prediction_id} onClick={() => setSelectedPrediction(p)} className="p-4 hover:bg-blue-50 cursor-pointer">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-semibold text-gray-800">{p.sub_category}</h4>
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${status}`}>{p.prediction_status}</span>
                                        </div>
                                        <p className="text-lg font-bold text-blue-700">{p.current_prediction}</p>
                                        <div className="mt-3">
                                            <div className="flex justify-between items-center mb-1 text-xs">
                                                <span className="font-semibold text-gray-600">置信度</span>
                                                <span className={`font-bold ${confidence.text}`}>{p.confidence_score}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div className={`${confidence.bar} h-2 rounded-full`} style={{ width: `${p.confidence_score}%` }}></div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">
                                            更新于 {new Date(p.last_updated_at).toLocaleDateString('zh-CN')} - {p.reasoning_log}
                                        </p>
                                    </div>
                                );
                            })}
                            </div>
                        </Accordion>
                    );
                })}
            </main>

            {/* Right Column (Conditional): Evidence Sidebar */}
             <aside className="w-1/5 h-full bg-gray-100 border-l p-6 overflow-y-auto">
                 <h2 className="text-lg font-bold text-gray-800 mb-4">决策大脑</h2>
                 <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <p className="text-sm text-gray-600">
                        这里是 **Auto-Prophet** 预测引擎的核心展示区。
                    </p>
                    <ul className="mt-3 text-xs text-gray-500 space-y-2 list-disc list-inside">
                        <li>点击左侧选择您关注的车型。</li>
                        <li>在中间的看板查看各技术维度的最新预测。</li>
                        <li>点击任意一条预测，即可在右侧滑出的面板中，追溯支撑该预测的所有情报证据。</li>
                    </ul>
                 </div>
            </aside>

            {selectedPrediction && <EvidenceSidebar prediction={selectedPrediction} onClose={() => setSelectedPrediction(null)} />}
        </div>
    );
};
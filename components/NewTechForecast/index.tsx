import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TechPrediction, PredictionEvidence, PredictionStatus, User } from '../../types';
import { mockTechPredictions, mockPredictionEvidence } from '../../mockData';
import { CloseIcon, PlusIcon, PencilIcon, DownloadIcon } from '../icons';

// --- Types ---
interface Vehicle {
    name: string;
    imageUrl: string;
    manufacturer: string;
    releaseDate: string;
    description: string;
}

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

const generateImageUrl = (vehicleName: string) => {
    const query = encodeURIComponent(`car,${vehicleName.split(' ')[0]}`);
    return `https://source.unsplash.com/random/400x200?${query}&sig=${Math.random()}`;
};


// --- Sub-Components ---
const VehicleModal: React.FC<{
    mode: 'add' | 'edit';
    vehicleToEdit?: Vehicle;
    onClose: () => void;
    onSave: (data: { name: string; imageUrl: string; manufacturer: string; releaseDate: string; description: string; originalName?: string }) => void;
}> = ({ mode, vehicleToEdit, onClose, onSave }) => {
    const [name, setName] = useState(vehicleToEdit?.name || '');
    const [manufacturer, setManufacturer] = useState(vehicleToEdit?.manufacturer || '');
    const [releaseDate, setReleaseDate] = useState(vehicleToEdit?.releaseDate || '');
    const [description, setDescription] = useState(vehicleToEdit?.description || '');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(vehicleToEdit?.imageUrl || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        if (!name.trim() || !manufacturer.trim()) return;

        let finalImageUrl = previewUrl;
        if (!finalImageUrl) {
            finalImageUrl = generateImageUrl(name);
        }

        onSave({
            name: name.trim(),
            imageUrl: finalImageUrl!,
            manufacturer: manufacturer.trim(),
            releaseDate,
            description: description.trim(),
            originalName: vehicleToEdit?.name,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">{mode === 'add' ? '新增预测车型' : '编辑车型信息'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors"> <CloseIcon className="w-6 h-6" /> </button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="vehicle-manufacturer" className="block text-sm font-medium text-gray-700 mb-1">车企</label>
                            <input id="vehicle-manufacturer" type="text" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="例如：小米" required className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label htmlFor="vehicle-name" className="block text-sm font-medium text-gray-700 mb-1">车型名称</label>
                            <input id="vehicle-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：SU9" required className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>
                     <div>
                        <label htmlFor="release-date" className="block text-sm font-medium text-gray-700 mb-1">预计发布时间</label>
                        <input id="release-date" type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                     <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">车型描述</label>
                        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="输入关于该车型的简短描述..." className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">背景图片 (可选)</label>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-40 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors overflow-hidden"
                        >
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center text-gray-500">
                                    <p>点击上传图片</p>
                                    <p className="text-xs mt-1">不上传将自动生成</p>
                                </div>
                            )}
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
                    <button onClick={handleSave} disabled={!name.trim() || !manufacturer.trim()} className="py-2 px-6 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:bg-blue-300">
                        保存
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
    const [predictions, setPredictions] = useState<TechPrediction[]>(mockTechPredictions);
    
    const initialVehicles = useMemo(() => {
        const uniqueNames = Array.from(new Set(predictions.map(p => p.vehicle_model)));
        // FIX: Add type annotation for `name` to resolve type inference errors on lines 166 and 172.
        return uniqueNames.map((name: string, index) => {
            // 智能提取车企名称
            const manufacturer = name.includes('SU9') ? '小米' : '理想';
            return {
                name,
                manufacturer,
                releaseDate: `2025-10-0${index+1}`,
                description: `这是关于 ${name} 的一段示例描述，介绍了它的市场定位和核心技术亮点。`,
                imageUrl: generateImageUrl(name)
            };
        });
    }, [predictions]);

    const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
    const [selectedVehicleName, setSelectedVehicleName] = useState(vehicles[0]?.name || '');
    const [selectedPrediction, setSelectedPrediction] = useState<TechPrediction | null>(null);
    const [modalState, setModalState] = useState<{ mode: 'add' | 'edit'; vehicle?: Vehicle } | null>(null);
    const [visibleEvidenceCount, setVisibleEvidenceCount] = useState(5);

    useEffect(() => {
        if (!selectedVehicleName && vehicles.length > 0) {
            setSelectedVehicleName(vehicles[0].name);
        }
    }, [vehicles, selectedVehicleName]);

    const intelligenceCountByVehicle = useMemo(() => {
        // Step 1: Create a map from vehicle model to a Set of unique evidence IDs.
        const evidenceSetsByVehicle = new Map<string, Set<string>>();
        predictions.forEach(p => {
            // Ensure a Set exists for the current vehicle model.
            if (!evidenceSetsByVehicle.has(p.vehicle_model)) {
                evidenceSetsByVehicle.set(p.vehicle_model, new Set<string>());
            }
            // Get the Set and add all supporting evidence IDs to it.
            const evidenceSet = evidenceSetsByVehicle.get(p.vehicle_model)!;
            p.supporting_evidence_ids.forEach(id => {
                evidenceSet.add(id);
            });
        });

        // Step 2: Create the final map from vehicle model to the count of unique evidence IDs.
        const counts = new Map<string, number>();
        evidenceSetsByVehicle.forEach((evidenceSet, vehicleModel) => {
            counts.set(vehicleModel, evidenceSet.size);
        });

        return counts;
    }, [predictions]);

    const predictionsByCategory = useMemo(() => {
        return predictions
            .filter(p => p.vehicle_model === selectedVehicleName)
            .reduce((acc, p) => {
                if (!acc[p.category]) acc[p.category] = [];
                acc[p.category].push(p);
                return acc;
            }, {} as Record<string, TechPrediction[]>);
    }, [selectedVehicleName, predictions]);
    
    const evidenceToVehicleMap = useMemo(() => {
        const map = new Map<string, string>();
        predictions.forEach(pred => {
            pred.supporting_evidence_ids.forEach(id => {
                map.set(id, pred.vehicle_model);
            });
        });
        return map;
    }, [predictions]);

    const evidenceToShow = useMemo(() => {
        let relevantEvidence: PredictionEvidence[];
        if (selectedPrediction) {
            const evidenceIds = new Set(selectedPrediction.supporting_evidence_ids);
            relevantEvidence = mockPredictionEvidence.filter(e => evidenceIds.has(e.evidence_id));
        } else {
            relevantEvidence = mockPredictionEvidence.filter(e => evidenceToVehicleMap.get(e.evidence_id) === selectedVehicleName);
        }
        return relevantEvidence.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
    }, [selectedVehicleName, selectedPrediction, evidenceToVehicleMap]);

    const visibleEvidence = useMemo(() => evidenceToShow.slice(0, visibleEvidenceCount), [evidenceToShow, visibleEvidenceCount]);

    const handleSaveVehicle = (data: { name: string; imageUrl: string; manufacturer: string; releaseDate: string; description: string; originalName?: string }) => {
        const vehicleData = {
            name: data.name,
            imageUrl: data.imageUrl,
            manufacturer: data.manufacturer,
            releaseDate: data.releaseDate,
            description: data.description,
        };

        if (data.originalName) { // Edit mode
            setVehicles(prev => prev.map(v => v.name === data.originalName ? vehicleData : v));
            if (data.name !== data.originalName) {
                setPredictions(prev => prev.map(p => p.vehicle_model === data.originalName ? { ...p, vehicle_model: data.name } : p));
            }
            if (selectedVehicleName === data.originalName) {
                setSelectedVehicleName(data.name);
            }
        } else { // Add mode
            const existing = vehicles.find(v => v.name === data.name);
            if (!existing) {
                setVehicles(prev => [vehicleData, ...prev]);
            }
            setSelectedVehicleName(data.name);
        }
        setModalState(null);
    };

    const handleSelectVehicle = (vehicleName: string) => {
        setSelectedVehicleName(vehicleName);
        setSelectedPrediction(null);
        setVisibleEvidenceCount(5);
    };
    
    const handleExportCsv = () => {
        if (!selectedVehicleName || Object.keys(predictionsByCategory).length === 0) {
            alert("没有可导出的数据。");
            return;
        }
    
        const headers = ['分类', '子分类', '预测内容', '置信度', '状态', '相关情报数量', '最新更新时间'];
        const rows = Object.entries(predictionsByCategory).flatMap(([category, preds]) =>
            (preds as TechPrediction[]).map(p => [
                category,
                p.sub_category,
                `"${p.current_prediction.replace(/"/g, '""')}"`, // Handle quotes for CSV
                p.confidence_score,
                p.prediction_status,
                p.supporting_evidence_ids.length,
                new Date(p.last_updated_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
            ])
        );
    
        // Prepend BOM for UTF-8 compatibility in Excel
        let csvContent = "\uFEFF";
        csvContent += headers.join(',') + '\r\n';
        csvContent += rows.map(row => row.join(',')).join('\r\n');
    
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${selectedVehicleName}_技术预测.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    };

    return (
        <div className="h-full bg-gray-50/70 flex overflow-hidden">
            {/* Left Column: Vehicle Selector */}
            <aside className="w-72 h-full overflow-y-auto bg-white border-r p-4 space-y-3 flex-shrink-0">
                <h2 className="text-sm font-semibold text-gray-500 px-2 uppercase tracking-wider mb-2">选择车型</h2>
                {user.email === '326575140@qq.com' && (
                    <button onClick={() => setModalState({ mode: 'add' })} className="w-full text-left px-3 py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center gap-3 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-dashed border-blue-300">
                        <PlusIcon className="w-5 h-5" />
                        <span>新增车型</span>
                    </button>
                )}
                {vehicles.map((vehicle) => {
                    const intelCount = intelligenceCountByVehicle.get(vehicle.name) || 0;
                    return (
                        <div
                            key={vehicle.name}
                            onClick={() => handleSelectVehicle(vehicle.name)}
                            className={`w-full p-4 rounded-lg text-white transition-all duration-300 cursor-pointer relative overflow-hidden group h-28 flex flex-col justify-end ${
                                selectedVehicleName === vehicle.name ? 'ring-2 ring-blue-500 shadow-lg' : ''
                            }`}
                            style={{
                                backgroundImage: `url('${vehicle.imageUrl}')`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                            }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20 group-hover:from-black/90 transition-all"></div>
                            
                            <div className="absolute top-2 right-2 z-20">
                                <span className="px-2 py-0.5 text-xs font-bold bg-white/20 backdrop-blur-sm rounded-full">{intelCount} 条情报</span>
                            </div>

                            <div className="relative z-10">
                                <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full mb-1.5">{vehicle.manufacturer}</span>
                                <h3 className="text-lg font-bold">{vehicle.name}</h3>
                                {vehicle.releaseDate && <p className="text-xs opacity-70 mt-1">预计发布: {vehicle.releaseDate}</p>}
                            </div>

                            {user.email === '326575140@qq.com' && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setModalState({ mode: 'edit', vehicle }); }}
                                    className="absolute bottom-3 right-3 p-1.5 bg-black/30 rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-black/60 transition-all z-20"
                                    title="编辑车型"
                                >
                                    <PencilIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    );
                })}
            </aside>

            {/* Middle Column: Prediction Board */}
            <main className="flex-1 h-full overflow-y-auto p-6">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-gray-900">{selectedVehicleName} - 技术预测看板</h1>
                    <button onClick={handleExportCsv} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-sm text-gray-700 font-semibold rounded-lg shadow-sm hover:bg-gray-100 transition">
                        <DownloadIcon className="w-4 h-4" />
                        导出CSV
                    </button>
                </div>
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
                            : `关于 “${selectedVehicleName}” 的 ${evidenceToShow.length} 条情报`
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
            
            {modalState?.mode && <VehicleModal mode={modalState.mode} vehicleToEdit={modalState.vehicle} onClose={() => setModalState(null)} onSave={handleSaveVehicle} />}
        </div>
    );
};
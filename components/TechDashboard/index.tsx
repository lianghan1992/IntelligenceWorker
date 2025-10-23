
import React, { useState, useMemo } from 'react';
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
    mockTechForecasts,
} from '../../mockData';
import { ChartIcon, BrainIcon, TagIcon, UsersIcon, TrendingUpIcon } from '../icons';

const modeOptions: { key: ComparisonMode; label: string; icon: React.FC<any> }[] = [
    { key: 'competitor', label: '竞品对比', icon: UsersIcon },
    { key: 'brand', label: '品牌分析', icon: TagIcon },
    { key: 'evolution', label: '车型演进', icon: TrendingUpIcon },
    { key: 'tech', label: '技术拆解', icon: ChartIcon },
    { key: 'forecast', label: '技术预测', icon: BrainIcon },
];

const renderSpec = (spec: string | SpecDetail | null | undefined): React.ReactNode => {
    if (spec === null || spec === undefined) {
        return <span className="text-gray-400">-</span>;
    }
    if (typeof spec === 'string') {
        return spec;
    }
    if (typeof spec === 'object' && 'value' in spec) {
        return (
            <div>
                <span>{spec.value}</span>
                {spec.supplier && <span className="text-xs text-gray-500 ml-2 bg-gray-100 px-1.5 py-0.5 rounded">@{spec.supplier}</span>}
            </div>
        );
    }
    return <span className="text-gray-400">-</span>;
};


const CompetitorView: React.FC = () => {
    const [selectedVehicles] = useState<VehicleTechSpec[]>([mockVehicleSpecs[0], mockVehicleSpecs[2], mockVehicleSpecs[4]]);

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">核心竞品技术参数对比</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 rounded-tl-lg min-w-[200px]">技术维度</th>
                            {selectedVehicles.map(v => (
                                <th key={v.id} scope="col" className="px-6 py-3 min-w-[200px]">{v.name}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {techDimensions.map((category) => (
                            <React.Fragment key={category.key}>
                                <tr className="bg-gray-100 font-semibold text-gray-800">
                                    <td colSpan={selectedVehicles.length + 1} className="px-4 py-2">{category.label}</td>
                                </tr>
                                {category.subDimensions.map(subDim => (
                                    <tr key={subDim.key} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{subDim.label}</td>
                                        {selectedVehicles.map(vehicle => (
                                            <td key={vehicle.id} className="px-6 py-4">
                                                {renderSpec(vehicle.specs[category.key]?.[subDim.key])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const ForecastView: React.FC = () => {
    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">前沿技术预测</h2>
            <div className="space-y-4">
                {mockTechForecasts.map(forecast => (
                    <div key={forecast.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold text-gray-800">{forecast.techName}</p>
                                <p className="text-sm text-gray-600">{forecast.brand} {forecast.model}</p>
                            </div>
                            <div className={`px-2 py-1 text-xs font-semibold rounded-full ${forecast.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {forecast.status === 'confirmed' ? '已确认' : '传闻'}
                            </div>
                        </div>
                         <div className="mt-3">
                            <p className="text-xs text-gray-500">来源: <a href={forecast.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{forecast.sourceArticle}</a></p>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${forecast.confidence * 100}%` }}></div>
                            </div>
                            <p className="text-right text-xs text-gray-500 mt-1">置信度: {Math.round(forecast.confidence * 100)}%</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

const PlaceholderView: React.FC<{ mode: ComparisonMode }> = ({ mode }) => {
    const option = modeOptions.find(opt => opt.key === mode);
    return (
        <div className="bg-white p-6 rounded-xl border-2 border-dashed flex items-center justify-center h-96">
            <div className="text-center text-gray-500">
                <p className="font-semibold text-lg">{option?.label} 视图正在建设中...</p>
                <p className="text-sm mt-1">此功能即将推出。</p>
            </div>
        </div>
    );
}

export const TechDashboard: React.FC = () => {
    const [mode, setMode] = useState<ComparisonMode>('competitor');

    const renderContent = () => {
        switch (mode) {
            case 'competitor':
                return <CompetitorView />;
            case 'forecast':
                return <ForecastView />;
            case 'brand':
            case 'evolution':
            case 'tech':
            case 'supply_chain':
                return <PlaceholderView mode={mode} />;
            default:
                return <CompetitorView />;
        }
    }

    return (
        <div className="p-6 bg-gray-50/50 min-h-full">
            <header className="mb-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-900">技术看板</h1>
                </div>
                 <p className="mt-1 text-gray-600">从多维度洞察和比较汽车行业的技术格局。</p>
            </header>

            <div className="mb-6 bg-white p-2 rounded-xl border inline-flex items-center gap-2">
                {modeOptions.map(option => (
                     <button
                        key={option.key}
                        onClick={() => setMode(option.key)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                            mode === option.key ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        <option.icon className="w-5 h-5" />
                        {option.label}
                    </button>
                ))}
            </div>

            <main>
                {renderContent()}
            </main>
        </div>
    );
};

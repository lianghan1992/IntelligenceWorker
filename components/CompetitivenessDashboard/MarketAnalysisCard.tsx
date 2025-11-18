import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { queryData } from '../../api';
import { MarketAnalysisFinding, DataQueryResponse } from '../../types';
import { EyeIcon } from '../icons';

const Spinner: React.FC = () => (
    <div className="flex justify-center items-center py-10">
        <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

interface MarketAnalysisCardProps {
    selectedEntityIds: string[];
}

const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return 'N/A';
    return num.toLocaleString();
};

const formatPercentage = (num: number | null | undefined) => {
    if (num === null || num === undefined) return 'N/A';
    return `${(num * 100).toFixed(2)}%`;
};

export const MarketAnalysisCard: React.FC<MarketAnalysisCardProps> = ({ selectedEntityIds }) => {
    const [findings, setFindings] = useState<MarketAnalysisFinding[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        if (selectedEntityIds.length === 0) {
            setFindings([]);
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            // FIX: Explicitly type the response to ensure correct type inference downstream.
            const response: DataQueryResponse<MarketAnalysisFinding> = await queryData(
                { limit: 100 },
                {
                    entity_ids: selectedEntityIds,
                    data_table: 'cdash_data_market'
                }
            );
            // FIX: Added a safeguard to ensure response.data is an array before using it.
            if (response && Array.isArray(response.data)) {
                setFindings(response.data);
            } else {
                setFindings([]);
            }
        } catch (e: any) {
            setError(e.message || '加载市场分析情报失败');
        } finally {
            setIsLoading(false);
        }
    }, [selectedEntityIds]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // FIX: Explicitly type groupedFindings to resolve '.map on unknown' error.
    const groupedFindings: Record<string, MarketAnalysisFinding[]> = useMemo(() => {
        return findings.reduce((acc, finding) => {
            const { entity_name } = finding;
            if (!acc[entity_name]) {
                acc[entity_name] = [];
            }
            acc[entity_name].push(finding);
            return acc;
        }, {} as Record<string, MarketAnalysisFinding[]>);
    }, [findings]);
    
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in-0">
            <header className="p-5 border-b border-gray-200 bg-gray-50/50 flex items-center gap-3">
                <EyeIcon className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-bold text-gray-800">市场分析看板</h2>
            </header>

            <div className="p-6">
                {isLoading ? <Spinner /> 
                : error ? <div className="p-4 text-center text-red-600 bg-red-50 rounded-lg">{error}</div>
                : Object.keys(groupedFindings).length === 0 ? (
                    <div className="text-center py-10 text-gray-500">未找到相关市场分析情报。</div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedFindings).map(([entityName, entityFindings]) => (
                            <div key={entityName}>
                                <h3 className="font-bold text-lg text-gray-900 mb-3">{entityName}</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm text-left text-gray-500 border rounded-lg">
                                        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                                            <tr>
                                                <th scope="col" className="px-6 py-3">营收 (万元)</th>
                                                <th scope="col" className="px-6 py-3">增长率</th>
                                                <th scope="col" className="px-6 py-3">市占率</th>
                                                <th scope="col" className="px-6 py-3">数据日期</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {entityFindings.map(finding => (
                                                <tr key={finding.id} className="bg-white border-b hover:bg-gray-50">
                                                    <td className="px-6 py-4 font-medium text-gray-900">{formatNumber(finding.revenue)}</td>
                                                    <td className={`px-6 py-4 font-medium ${ (finding.growth_rate ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercentage(finding.growth_rate)}</td>
                                                    <td className="px-6 py-4 font-medium">{formatPercentage(finding.market_share)}</td>
                                                    <td className="px-6 py-4">{new Date(finding.event_date || finding.updated_at).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
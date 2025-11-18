import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { queryData } from '../../api';
import { VehicleTechnologyFinding, DataQueryResponse } from '../../types';
import { BrainIcon, ClockIcon } from '../icons';

const Spinner: React.FC = () => (
    <div className="flex justify-center items-center py-10">
        <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

interface VehicleTechnologyCardProps {
    selectedEntityIds: string[];
}

export const VehicleTechnologyCard: React.FC<VehicleTechnologyCardProps> = ({ selectedEntityIds }) => {
    const [findings, setFindings] = useState<VehicleTechnologyFinding[]>([]);
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
            const response: DataQueryResponse<VehicleTechnologyFinding> = await queryData(
                { limit: 100 }, // Query params
                { // Body
                    entity_ids: selectedEntityIds,
                    data_table: 'cdash_data_technology'
                }
            );
            // FIX: Added a safeguard to ensure response.data is an array before using it.
            if (response && Array.isArray(response.data)) {
                setFindings(response.data);
            } else {
                setFindings([]);
            }
        } catch (e: any) {
            setError(e.message || '加载技术情报失败');
        } finally {
            setIsLoading(false);
        }
    }, [selectedEntityIds]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // FIX: Explicitly type groupedFindings to resolve '.map on unknown' error.
    const groupedFindings: Record<string, VehicleTechnologyFinding[]> = useMemo(() => {
        return findings.reduce((acc, finding) => {
            const { entity_name } = finding;
            if (!acc[entity_name]) {
                acc[entity_name] = [];
            }
            acc[entity_name].push(finding);
            return acc;
        }, {} as Record<string, VehicleTechnologyFinding[]>);
    }, [findings]);
    
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in-0">
            <header className="p-5 border-b border-gray-200 bg-gray-50/50 flex items-center gap-3">
                <BrainIcon className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-800">车企车型新技术看板</h2>
            </header>

            <div className="p-6">
                {isLoading ? <Spinner /> 
                : error ? <div className="p-4 text-center text-red-600 bg-red-50 rounded-lg">{error}</div>
                : Object.keys(groupedFindings).length === 0 ? (
                    <div className="text-center py-10 text-gray-500">未找到相关技术情报。</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(groupedFindings).map(([entityName, entityFindings]) => (
                            <div key={entityName} className="bg-gray-50 rounded-xl border p-4">
                                <h3 className="font-bold text-gray-900 mb-3">{entityName}</h3>
                                <div className="space-y-3">
                                    {entityFindings.map(finding => (
                                        <div key={finding.id} className="bg-white p-3 rounded-lg border shadow-sm">
                                            <p className="font-semibold text-gray-800">
                                                {finding.technology_name ? finding.technology_name : <span className="italic text-gray-500">[技术名称缺失]</span>}
                                            </p>
                                            <div className="mt-2 space-y-1 text-xs text-gray-600">
                                                <p><strong>应用领域:</strong> {finding.application_area || 'N/A'}</p>
                                                <p><strong>成熟度:</strong> {finding.maturity_level || 'N/A'}</p>
                                                <p className="flex items-center gap-1.5 mt-2 text-gray-500">
                                                    <ClockIcon className="w-3 h-3" />
                                                    {new Date(finding.event_date || finding.updated_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
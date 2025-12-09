
import React, { useState, useEffect } from 'react';
import { getServiceHealth } from '../../../api/intelligence';
import { RefreshIcon, CheckCircleIcon, ShieldExclamationIcon } from '../../icons';

export const ServiceStatus: React.FC = () => {
    const [status, setStatus] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchStatus = async () => {
        setIsLoading(true);
        try {
            const res = await getServiceHealth();
            setStatus(res.status);
        } catch (e) { 
            setStatus('error');
        } finally { 
            setIsLoading(false); 
        }
    };

    useEffect(() => { fetchStatus(); }, []);

    return (
        <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">系统运行状态</h3>
                <button onClick={fetchStatus} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                    <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="flex items-center gap-4">
                <div className={`p-4 rounded-full ${status === 'ok' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {status === 'ok' ? (
                        <CheckCircleIcon className="w-8 h-8 text-green-600" />
                    ) : (
                        <ShieldExclamationIcon className="w-8 h-8 text-red-600" />
                    )}
                </div>
                <div>
                    <div className="text-sm text-gray-500 font-medium uppercase tracking-wider">IntelSpider Service</div>
                    <div className={`text-2xl font-bold ${status === 'ok' ? 'text-green-700' : 'text-red-700'}`}>
                        {status === 'ok' ? '运行正常 (Healthy)' : '服务异常 (Error)'}
                    </div>
                </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-100 text-sm text-gray-500">
                <p>后端服务地址: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">/api/</span></p>
            </div>
        </div>
    );
};

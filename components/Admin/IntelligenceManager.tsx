import React from 'react';

export const IntelligenceManager: React.FC = () => {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">情报点与源管理</h1>
                <button className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition">
                    添加新源
                </button>
            </div>
            <div className="bg-white p-6 rounded-lg border">
                <p className="text-gray-600">管理情报来源、订阅点和处理规则的功能将在此处实现。</p>
            </div>
        </div>
    );
};

import React from 'react';
import { InfoItem } from '../types';
import { ArrowLeftIcon } from './icons';

interface InfoDetailViewProps {
    item: InfoItem;
    onBack: () => void;
}

export const InfoDetailView: React.FC<InfoDetailViewProps> = ({ item, onBack }) => {
    const source = {
        name: item.source_name,
        iconUrl: `https://logo.clearbit.com/${item.source_name.replace(/ /g, '').toLowerCase()}.com`,
    };

    const contentParagraphs = item.content.split('\n').filter(p => p.trim() !== '').map((p, i) => <p key={i}>{p}</p>);

    return (
        <div className="p-6 md:p-8 bg-gray-50">
            <button onClick={onBack} className="flex items-center space-x-2 text-sm font-semibold text-blue-600 hover:underline mb-6">
                <ArrowLeftIcon className="w-4 h-4" />
                <span>返回信息流</span>
            </button>
            <div className="bg-white p-6 md:p-10 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-4 mb-4">
                    <img src={source.iconUrl} alt={source.name} className="w-10 h-10 rounded-full bg-gray-100" />
                    <div>
                        <p className="font-semibold text-gray-800 text-lg">{source.name}</p>
                        <p className="text-sm text-gray-500">{new Date(item.publish_date || item.created_at).toLocaleString('zh-CN')}</p>
                    </div>
                </div>
                <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-5">{item.title}</h1>
                <div className="flex flex-wrap gap-2 mb-8">
                    <span className="px-3 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full">{item.point_name}</span>
                </div>
                 <div 
                    className="prose prose-lg max-w-none text-gray-800
                               prose-p:leading-relaxed"
                >
                    {contentParagraphs}
                </div>
                <div className="mt-8 pt-4 border-t">
                     <a href={item.original_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">查看原文</a>
                </div>
            </div>
        </div>
    );
};
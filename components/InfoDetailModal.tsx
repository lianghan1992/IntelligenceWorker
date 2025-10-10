import React from 'react';
import { InfoItem } from '../types';
import { CloseIcon } from './icons';

interface InfoDetailModalProps {
    item: InfoItem;
    onClose: () => void;
}

export const InfoDetailModal: React.FC<InfoDetailModalProps> = ({ item, onClose }) => {
    const source = {
        name: item.source_name,
        iconUrl: `https://logo.clearbit.com/${item.source_name.replace(/ /g, '').toLowerCase()}.com`,
    };

    const [imgError, setImgError] = React.useState(false);

    return (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in-0">
            <div className="bg-white rounded-2xl w-full max-w-3xl h-[90vh] flex flex-col shadow-xl transform transition-all animate-in zoom-in-95">
                <div className="p-5 border-b flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center space-x-3 overflow-hidden">
                        {imgError ? (
                             <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold flex-shrink-0">
                                {source.name.charAt(0)}
                            </div>
                        ) : (
                             <img 
                                src={source.iconUrl} 
                                alt={source.name} 
                                className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0"
                                onError={() => setImgError(true)}
                             />
                        )}
                         
                         <div className="overflow-hidden">
                            <h3 className="text-md font-semibold text-gray-800 truncate">{item.source_name}</h3>
                            <p className="text-xs text-gray-500">{new Date(item.publish_date || item.created_at).toLocaleString('zh-CN')}</p>
                         </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                         <a href={item.original_url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors">
                            查看原文
                         </a>
                        <button onClick={onClose} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 bg-gray-50 overflow-y-auto p-6 lg:p-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{item.title}</h1>
                    <span className="px-2.5 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full mb-6 inline-block">
                        {item.point_name}
                    </span>
                    <article 
                        className="prose prose-slate max-w-none 
                                   prose-p:leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: item.content }}
                    />
                </div>
            </div>
        </div>
    );
};
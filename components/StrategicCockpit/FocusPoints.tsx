import React from 'react';
import { ApiPoi } from '../../types';
import { TagIcon, GearIcon } from '../icons';

interface FocusPointsProps {
    onManageClick: () => void;
    pois: ApiPoi[];
    isLoading: boolean;
    onPoiClick: (value: string, label: string) => void;
    activeQuery: { type: string; value: string };
}

export const FocusPoints: React.FC<FocusPointsProps> = ({ onManageClick, pois, isLoading, onPoiClick, activeQuery }) => {
    return (
        <div className="mt-2">
            <div className="flex items-center justify-between px-4 py-2 mb-2">
                <h3 className="text-sm font-bold text-gray-500">
                    我的关注点
                </h3>
                <button onClick={onManageClick} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="管理关注点">
                    <GearIcon className="w-4 h-4" />
                </button>
            </div>
            <div className="space-y-1">
                {isLoading ? (
                    <div className="px-4 py-2 text-sm text-gray-400 animate-pulse">加载中...</div>
                ) : pois.length > 0 ? (
                    pois.map(poi => {
                        const isActive = activeQuery.type === 'poi' && activeQuery.value === poi.content;
                        return (
                            <button 
                                key={poi.id} 
                                onClick={() => onPoiClick(poi.content, poi.content)}
                                className={`
                                    w-full text-left px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 truncate flex items-center gap-3
                                    ${isActive 
                                        ? 'bg-purple-100 text-purple-900 font-semibold' 
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }
                                `}
                                title={poi.content}
                            >
                                <TagIcon className={`w-4 h-4 ${isActive ? 'text-purple-700' : 'text-gray-400'}`} />
                                {poi.content}
                            </button>
                        );
                    })
                ) : (
                    <div className="px-4 py-4 text-sm text-gray-500 text-center bg-gray-50 rounded-xl mx-2 border border-gray-100 border-dashed">
                        暂无关注点
                    </div>
                )}
            </div>
        </div>
    );
};
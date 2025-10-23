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
        <div className="bg-white rounded-2xl border border-gray-200 p-3">
            <div className="flex items-center justify-between p-3">
                <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-3">
                    <TagIcon className="w-5 h-5 text-gray-500" />
                    我的关注点
                </h3>
                <button onClick={onManageClick} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md" title="管理关注点">
                    <GearIcon className="w-4 h-4" />
                </button>
            </div>
            <div className="space-y-1">
                {isLoading ? (
                    <div className="px-3 py-2 text-sm text-gray-400">加载中...</div>
                ) : pois.length > 0 ? (
                    pois.map(poi => {
                        const isActive = activeQuery.type === 'poi' && activeQuery.value === poi.content;
                        return (
                            <button 
                                key={poi.id} 
                                onClick={() => onPoiClick(poi.content, poi.content)}
                                className={`w-full text-left px-5 py-2 rounded-md text-sm text-gray-700 transition-colors ${
                                    isActive ? 'bg-blue-50 font-semibold text-blue-700' : 'hover:bg-gray-50'
                                }`}
                            >
                                {poi.content}
                            </button>
                        );
                    })
                ) : (
                    <div className="px-3 py-2 text-sm text-gray-400 text-center">暂无关注点</div>
                )}
            </div>
        </div>
    );
};

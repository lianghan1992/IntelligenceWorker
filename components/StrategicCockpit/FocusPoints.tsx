
import React from 'react';
import { ApiPoi } from '../../types';
import { TagIcon, GearIcon, PlusIcon } from '../icons';

interface FocusPointsProps {
    onManageClick: () => void;
    pois: ApiPoi[];
    isLoading: boolean;
    onPoiClick: (value: string, label: string) => void;
    activeQuery: { type: string; value: string };
}

export const FocusPoints: React.FC<FocusPointsProps> = ({ onManageClick, pois, isLoading, onPoiClick, activeQuery }) => {
    return (
        <div className="flex items-center h-full pl-4 border-l border-slate-200 ml-4">
            <div className="flex items-center gap-2 mr-3 text-xs font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
                <TagIcon className="w-3.5 h-3.5" />
                <span>我的关注</span>
            </div>
            
            <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar max-w-[400px] xl:max-w-[600px]">
                {isLoading ? (
                    <div className="text-xs text-slate-300 animate-pulse px-2">加载中...</div>
                ) : pois.length > 0 ? (
                    pois.map(poi => {
                        const isActive = activeQuery.type === 'poi' && activeQuery.value === poi.content;
                        return (
                            <button 
                                key={poi.id} 
                                onClick={() => onPoiClick(poi.content, poi.content)}
                                className={`
                                    flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 border
                                    ${isActive 
                                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm' 
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300 hover:text-purple-600'
                                    }
                                `}
                                title={poi.keywords ? `关键词: ${poi.keywords}` : poi.content}
                            >
                                {poi.content}
                            </button>
                        );
                    })
                ) : (
                    <span className="text-xs text-slate-400">暂无关注点</span>
                )}
                
                <button 
                    onClick={onManageClick} 
                    className="flex-shrink-0 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors border border-dashed border-slate-300 hover:border-indigo-300" 
                    title="管理关注点"
                >
                    <PlusIcon className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
};

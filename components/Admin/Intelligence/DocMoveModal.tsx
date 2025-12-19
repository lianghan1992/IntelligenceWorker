
import React, { useState } from 'react';
import { DocTag } from '../../../types';
import { batchUpdateDocsPoint } from '../../../api/intelligence';
import { CloseIcon, ArrowRightIcon } from '../../icons';

interface DocMoveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    tags: DocTag[];
}

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const DocMoveModal: React.FC<DocMoveModalProps> = ({ isOpen, onClose, onSuccess, tags }) => {
    const [oldTagUuid, setOldTagUuid] = useState('');
    const [newTagUuid, setNewTagUuid] = useState('');
    const [isMoving, setIsMoving] = useState(false);

    const handleMove = async () => {
        if (!oldTagUuid || !newTagUuid || oldTagUuid === newTagUuid) return;
        setIsMoving(true);
        try {
            await batchUpdateDocsPoint({
                old_point_uuid: oldTagUuid,
                new_point_uuid: newTagUuid
            });
            alert('迁移成功');
            onSuccess();
        } catch (e: any) {
            alert(`迁移失败: ${e.message}`);
        } finally {
            setIsMoving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <ArrowRightIcon className="w-5 h-5 text-indigo-600" /> 批量迁移文档
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><CloseIcon className="w-5 h-5"/></button>
                </div>

                <div className="space-y-4">
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-xs text-orange-700 leading-relaxed mb-4">
                        此操作将把 <b>源标签</b> 下的所有文档批量移动到 <b>目标标签</b>。请谨慎操作。
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">从 (源标签)</label>
                        <select 
                            value={oldTagUuid} 
                            onChange={e => setOldTagUuid(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="">-- 请选择 --</option>
                            {tags.map(t => <option key={t.uuid} value={t.uuid}>{t.name}</option>)}
                        </select>
                    </div>

                    <div className="flex justify-center">
                        <div className="p-2 bg-gray-100 rounded-full text-gray-400">
                            <ArrowRightIcon className="w-4 h-4 rotate-90 sm:rotate-0" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">移动到 (目标标签)</label>
                        <select 
                            value={newTagUuid} 
                            onChange={e => setNewTagUuid(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="">-- 请选择 --</option>
                            {tags.map(t => <option key={t.uuid} value={t.uuid}>{t.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-8">
                    <button onClick={onClose} className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors">取消</button>
                    <button 
                        onClick={handleMove} 
                        disabled={isMoving || !oldTagUuid || !newTagUuid || oldTagUuid === newTagUuid}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-md transition-all active:scale-95"
                    >
                        {isMoving ? <Spinner /> : <ArrowRightIcon className="w-4 h-4"/>} 确认迁移
                    </button>
                </div>
            </div>
        </div>
    );
};

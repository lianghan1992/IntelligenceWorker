
import React, { useState } from 'react';
import { createSpiderPoint } from '../../../api/intelligence';
import { CloseIcon, RssIcon } from '../../icons';

interface PointModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    sourceId?: string;
}

export const PointModal: React.FC<PointModalProps> = ({ isOpen, onClose, onSave, sourceId }) => {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [cron, setCron] = useState('30 13 */2 * *');
    const [pages, setPages] = useState(100);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!name || !url || !sourceId) return;
        setIsLoading(true);
        try {
            await createSpiderPoint({
                source_uuid: sourceId,
                name,
                url,
                cron_schedule: cron,
                initial_pages: pages,
                is_active: true
            });
            onSave();
            onClose();
            // Reset
            setName(''); setUrl(''); setCron('30 13 */2 * *'); setPages(100);
        } catch (e) {
            console.error(e);
            alert('创建采集点失败');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <RssIcon className="w-5 h-5 text-indigo-600"/> 新建采集点
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><CloseIcon className="w-5 h-5"/></button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">采集点名称 <span className="text-red-500">*</span></label>
                        <input value={name} onChange={e => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. 车企资讯" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">列表页 URL <span className="text-red-500">*</span></label>
                        <input value={url} onChange={e => setUrl(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-slate-600" placeholder="https://..." />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Cron 调度表达式</label>
                        <input value={cron} onChange={e => setCron(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono" />
                        <p className="text-xs text-gray-400 mt-1">分 时 日 月 周 (e.g. 30 13 */2 * *)</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">首次采集页数限制</label>
                        <input type="number" value={pages} onChange={e => setPages(parseInt(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div className="p-4 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100">
                        提示: 创建成功后，请在生成的 <code>crawlers/&#123;source_uuid&#125;/</code> 目录下编写 <code>crawler.py</code> 以实现具体爬取逻辑。
                    </div>
                </div>

                <div className="p-5 border-t bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100">取消</button>
                    <button onClick={handleSubmit} disabled={isLoading || !name || !url} className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
                        {isLoading ? '提交中...' : '创建'}
                    </button>
                </div>
            </div>
        </div>
    );
};

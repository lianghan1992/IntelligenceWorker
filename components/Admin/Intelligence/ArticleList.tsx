
import React, { useState, useEffect } from 'react';
import { SpiderArticle } from '../../../types';
import { getSpiderArticles, getSpiderPoints } from '../../../api/intelligence';
import { RefreshIcon, ExternalLinkIcon, CheckCircleIcon, QuestionMarkCircleIcon } from '../../icons';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const ArticleList: React.FC = () => {
    const [articles, setArticles] = useState<SpiderArticle[]>([]);
    const [pointsMap, setPointsMap] = useState<Record<string, string>>({}); // ID -> Name
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPoint, setSelectedPoint] = useState('');
    const [points, setPoints] = useState<{id: string, name: string}[]>([]);

    useEffect(() => {
        // Load points metadata for filter and mapping
        getSpiderPoints().then(res => {
            const map: Record<string, string> = {};
            res.forEach(p => map[p.id] = p.point_name);
            setPointsMap(map);
            setPoints(res.map(p => ({ id: p.id, name: p.point_name })));
        });
    }, []);

    const fetchArticles = async () => {
        setIsLoading(true);
        try {
            const res = await getSpiderArticles({ point_id: selectedPoint || undefined });
            setArticles(res);
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    useEffect(() => { fetchArticles(); }, [selectedPoint]);

    return (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-full overflow-hidden shadow-sm">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-emerald-600"/> 采集文章库
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{articles.length}</span>
                    </h3>
                    <select 
                        value={selectedPoint} 
                        onChange={e => setSelectedPoint(e.target.value)}
                        className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2 outline-none"
                    >
                        <option value="">所有采集点</option>
                        {points.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <button onClick={fetchArticles} className="p-2 hover:bg-gray-200 rounded text-gray-500 border bg-white"><RefreshIcon className={`w-4 h-4 ${isLoading?'animate-spin':''}`}/></button>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b sticky top-0">
                        <tr>
                            <th className="px-6 py-3">标题</th>
                            <th className="px-6 py-3">采集点</th>
                            <th className="px-6 py-3">发布时间</th>
                            <th className="px-6 py-3">采集时间</th>
                            <th className="px-6 py-3">状态</th>
                            <th className="px-6 py-3 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {articles.length === 0 && !isLoading ? (
                            <tr><td colSpan={6} className="text-center py-20 text-gray-400">暂无数据</td></tr>
                        ) : (
                            articles.map(article => (
                                <tr key={article.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900 max-w-sm truncate" title={article.title}>{article.title}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded inline-block">
                                            {pointsMap[article.point_id] || article.point_id.slice(0,8)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs">{article.publish_time || '-'}</td>
                                    <td className="px-6 py-4 text-xs font-mono text-gray-400">{new Date(article.collected_at).toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        {article.is_reviewed ? (
                                            <span className="text-green-600 flex items-center gap-1 text-xs font-bold"><CheckCircleIcon className="w-3.5 h-3.5"/> Reviewed</span>
                                        ) : (
                                            <span className="text-yellow-600 flex items-center gap-1 text-xs font-bold"><QuestionMarkCircleIcon className="w-3.5 h-3.5"/> Unreviewed</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <a href={article.original_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center justify-end gap-1 text-xs">
                                            <ExternalLinkIcon className="w-3 h-3"/> 原文
                                        </a>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

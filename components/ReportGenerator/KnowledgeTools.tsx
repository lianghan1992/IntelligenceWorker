
import React, { useState, useRef, useEffect } from 'react';
import { 
    CloudIcon, SearchIcon, LinkIcon, CloseIcon, CheckIcon, 
    TrashIcon, RefreshIcon, GlobeIcon, ExternalLinkIcon, ChevronDownIcon,
    LightningBoltIcon, ServerIcon, DatabaseIcon, ClockIcon, GearIcon,
    ShieldExclamationIcon, ShieldCheckIcon
} from '../icons';
import { fetchJinaReader } from '../../api/intelligence';

// --- Constants ---
const DEFAULT_GOOGLE_KEY = 'AIzaSyBHC1sLIvdoVZIT0JrfPbP7d8KhcIb3738';
const DEFAULT_GOOGLE_CX = '33dd9593bf20144a8'; // Provided default
const STORAGE_KEY_LIMIT = 'auto_insight_search_usage';
const STORAGE_KEY_CONFIG = 'auto_insight_search_config';
const DAILY_LIMIT = 5;

interface KnowledgeToolsProps {
    onUpdateReference: (content: string, sourceName: string) => void;
    currentReferences: string;
}

interface ReferenceDetail {
    title: string;
    url: string;
    source?: string;
    snippet?: string;
}

interface ReferenceItem {
    id: string;
    type: 'file' | 'search' | 'url';
    name: string;
    status: 'processing' | 'done' | 'error';
    content?: string;
    details?: ReferenceDetail[];
    progress?: number; // 0-100
    logs?: string[]; // Process logs
}

// --- Helper: Daily Limit Check ---
const checkDailyQuota = (): { allowed: boolean; remaining: number } => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const recordStr = localStorage.getItem(STORAGE_KEY_LIMIT);
        let record = recordStr ? JSON.parse(recordStr) : { date: today, count: 0 };

        if (record.date !== today) {
            record = { date: today, count: 0 };
        }

        const remaining = Math.max(0, DAILY_LIMIT - record.count);
        return { allowed: record.count < DAILY_LIMIT, remaining };
    } catch (e) {
        return { allowed: true, remaining: DAILY_LIMIT }; // Fail open if storage error
    }
};

const incrementDailyQuota = () => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const recordStr = localStorage.getItem(STORAGE_KEY_LIMIT);
        let record = recordStr ? JSON.parse(recordStr) : { date: today, count: 0 };
        
        if (record.date !== today) {
            record = { date: today, count: 0 };
        }
        
        record.count += 1;
        localStorage.setItem(STORAGE_KEY_LIMIT, JSON.stringify(record));
    } catch (e) {
        console.error("Failed to update quota", e);
    }
};

// --- Helper: Content Validation ---
const isValidContent = (content: string): boolean => {
    if (!content || content.length < 200) return false; // Too short
    
    const errorKeywords = [
        "403 Forbidden", 
        "404 Not Found", 
        "Access Denied", 
        "Cloudflare", 
        "Verify you are human", 
        "Just a moment...", 
        "Enable JavaScript",
        "Attention Required!",
        "Security check",
        "bilibili-error-img" // Specific site errors
    ];
    
    // Check if content contains typical error page text
    if (errorKeywords.some(kw => content.includes(kw))) return false;
    
    return true;
};


// --- Component: Tech Loader ---
const TechLoader: React.FC<{ logs: string[] }> = ({ logs }) => (
    <div className="w-full bg-slate-900 rounded-xl p-4 font-mono text-xs overflow-hidden relative min-h-[160px] flex flex-col shadow-inner">
        {/* Scanning Line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-scan-fast opacity-50"></div>
        
        {/* Matrix Background */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#22d3ee 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>

        <div className="relative z-10 flex-1 flex flex-col justify-end space-y-1.5">
            {logs.slice(-6).map((log, i) => (
                <div key={i} className={`flex items-center gap-2 ${i === logs.slice(-6).length - 1 ? 'text-cyan-400 font-bold' : 'text-slate-500'}`}>
                    <span className="text-[10px] opacity-50">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                    <span className="truncate">{'>'} {log}</span>
                </div>
            ))}
            <div className="flex items-center gap-1 text-cyan-500 animate-pulse mt-2">
                <span className="w-2 h-4 bg-cyan-500"></span>
                <span className="opacity-0">_</span>
            </div>
        </div>
    </div>
);

export const KnowledgeTools: React.FC<KnowledgeToolsProps> = ({ onUpdateReference, currentReferences }) => {
    const [items, setItems] = useState<ReferenceItem[]>([]);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isUrlOpen, setIsUrlOpen] = useState(false);
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
    const [quota, setQuota] = useState(checkDailyQuota());
    
    // Processing State for Modal
    const [processingItemId, setProcessingItemId] = useState<string | null>(null);

    // Config State
    const [config, setConfig] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
        return saved ? JSON.parse(saved) : { apiKey: DEFAULT_GOOGLE_KEY, cx: DEFAULT_GOOGLE_CX };
    });
    const [isConfigMode, setIsConfigMode] = useState(false);

    // Check if user is using a custom key
    const isCustomKey = config.apiKey !== DEFAULT_GOOGLE_KEY && config.apiKey.trim() !== '';

    // Inputs
    const [searchKeyword, setSearchKeyword] = useState('');
    const [urlInput, setUrlInput] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Refresh quota display on mount/update
    useEffect(() => {
        setQuota(checkDailyQuota());
    }, [isSearchOpen]);

    const saveConfig = (newConfig: { apiKey: string, cx: string }) => {
        // If empty, revert to default for logic consistency
        const finalConfig = {
            apiKey: newConfig.apiKey.trim() || DEFAULT_GOOGLE_KEY,
            cx: newConfig.cx.trim() || DEFAULT_GOOGLE_CX
        };
        setConfig(finalConfig);
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(finalConfig));
        setIsConfigMode(false);
    };

    const addReferenceItem = (type: 'file' | 'search' | 'url', name: string): string => {
        const id = crypto.randomUUID();
        setItems(prev => [{ 
            id, 
            type, 
            name, 
            status: 'processing', 
            details: [], 
            progress: 0, 
            logs: ['初始化任务...'] 
        }, ...prev]);
        // Do NOT expand automatically, we show modal instead
        // setExpandedItemId(id); 
        return id;
    };

    const updateItemState = (id: string, updates: Partial<ReferenceItem>) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const appendLog = (id: string, log: string) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, logs: [...(item.logs || []), log] } : item));
    };

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
        if (expandedItemId === id) setExpandedItemId(null);
    };

    // --- 1. File Upload Logic ---
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        const id = addReferenceItem('file', file.name);
        setProcessingItemId(id); // Show modal

        try {
            appendLog(id, `读取文件: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
            const text = await file.text();
            const formattedContent = `\n\n--- 引用文档: ${file.name} ---\n${text}\n--- 文档结束 ---\n`;
            
            // Wait a bit to show progress
            await new Promise(r => setTimeout(r, 500));
            
            updateItemState(id, { 
                status: 'done', 
                content: formattedContent, 
                progress: 100, 
                details: [{ title: file.name, url: '#' }] 
            });
            onUpdateReference(formattedContent, file.name);
        } catch (err) {
            console.error(err);
            updateItemState(id, { status: 'error' });
            appendLog(id, '文件读取失败');
        } finally {
             setTimeout(() => setProcessingItemId(null), 800);
        }
        
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // --- 2. Google Search Logic ---
    const handleSearch = async () => {
        if (!searchKeyword.trim()) return;
        
        if (!config.cx) {
            setIsConfigMode(true);
            return;
        }

        // Check Quota ONLY if NOT using custom key
        if (!isCustomKey) {
            const { allowed } = checkDailyQuota();
            if (!allowed) {
                alert('已超出默认 API 的每日限额，请配置您自己的 Google API Key 以继续使用，或等待明日刷新。');
                return;
            }
        }

        const keyword = searchKeyword.trim();
        setIsSearchOpen(false);
        setSearchKeyword('');
        
        const id = addReferenceItem('search', `${keyword}`);
        setProcessingItemId(id); // Show progress modal
        
        try {
            // Step 1: Call Google API
            appendLog(id, `连接 Google Search API...`);
            const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${config.apiKey}&cx=${config.cx}&q=${encodeURIComponent(keyword)}&num=10`; 
            
            const response = await fetch(searchUrl);
            
            if (!response.ok) {
                if (response.status === 403 || response.status === 429) {
                     throw new Error("API 配额已耗尽，请更换 Key 或等待恢复。");
                }
                if (response.status === 400) {
                     throw new Error("配置无效: 请检查 API Key 和 CX ID 是否正确。");
                }
                throw new Error(`Search API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const items = data.items || [];

            if (items.length === 0) {
                throw new Error("未找到相关结果");
            }

            appendLog(id, `获取到 ${items.length} 条结果，开始抓取与过滤...`);
            
            // Only consume quota if using default key
            if (!isCustomKey) {
                incrementDailyQuota(); 
                setQuota(checkDailyQuota());
            }

            // Step 2: Parallel Fetch Content via Jina & Filter
            const topItems = items.slice(0, 6); // Try top 6
            let processedCount = 0;
            
            const fetchPromises = topItems.map(async (item: any, idx: number) => {
                try {
                    appendLog(id, `正在读取 [${idx+1}]: ${item.title.slice(0, 15)}...`);
                    const content = await fetchJinaReader(item.link);
                    
                    if (!isValidContent(content)) {
                         appendLog(id, `⚠️ 过滤无效/403页面: ${item.title.slice(0, 10)}...`);
                         processedCount++;
                         updateItemState(id, { progress: 20 + Math.floor((processedCount / topItems.length) * 80) });
                         return null;
                    }
                    
                    processedCount++;
                    updateItemState(id, { progress: 20 + Math.floor((processedCount / topItems.length) * 80) });
                    
                    // Create Detail Object
                    return {
                        title: item.title,
                        url: item.link,
                        source: item.displayLink,
                        snippet: item.snippet,
                        markdown: `### [${idx + 1}] ${item.title}\n**Source**: ${item.link}\n\n${content.slice(0, 3000)}...`
                    };
                } catch (e) {
                    appendLog(id, `解析失败: ${item.title.slice(0, 15)}...`);
                    return null;
                }
            });

            const results = await Promise.all(fetchPromises);
            const validResults = results.filter(Boolean);

            if (validResults.length === 0) {
                 throw new Error("所有搜索结果均无法读取有效内容（可能存在反爬虫限制）。");
            }

            // Construct Final Content
            const validContentStr = validResults.map(r => r?.markdown).join('\n\n---\n\n');
            const finalContent = `\n\n--- 联网搜索报告: ${keyword} ---\n${validContentStr}\n--- 搜索结束 ---\n`;
            
            // Construct Details for UI
            const validDetails: ReferenceDetail[] = validResults.map(r => ({
                title: r!.title,
                url: r!.url,
                source: r!.source,
                snippet: r!.snippet
            }));

            appendLog(id, `任务完成。已聚合 ${validResults.length} 篇有效内容。`);
            updateItemState(id, { status: 'done', content: finalContent, progress: 100, details: validDetails });
            onUpdateReference(finalContent, `Search: ${keyword}`);

        } catch (e: any) {
            console.error(e);
            updateItemState(id, { status: 'error' });
            appendLog(id, `错误: ${e.message}`);
            // If error is config related, suggest opening config
            if (e.message.includes("配置无效") || e.message.includes("400")) {
                setIsSearchOpen(true);
                setIsConfigMode(true);
            }
        } finally {
            // Close modal after delay to let user see "Done"
            setTimeout(() => {
                setProcessingItemId(null);
            }, 1200);
        }
    };

    // --- 3. URL Import Logic ---
    const handleUrlImport = async () => {
        if (!urlInput.trim()) return;
        const urls = urlInput.split('\n').filter(u => u.trim());
        setIsUrlOpen(false);
        setUrlInput('');

        const id = addReferenceItem('url', `解析 ${urls.length} 个链接`);
        setProcessingItemId(id);

        try {
            let processed = 0;
            appendLog(id, `开始解析 ${urls.length} 个目标 URL...`);

            const results = await Promise.all(urls.map(async (url) => {
                try {
                    const content = await fetchJinaReader(url.trim());
                    
                    if (!isValidContent(content)) {
                        appendLog(id, `⚠️ 内容无效/无法访问: ${url}`);
                        processed++;
                        return null;
                    }

                    // Extract title
                    const titleMatch = content.match(/^#\s+(.+)$/m);
                    const title = titleMatch ? titleMatch[1] : url;
                    
                    processed++;
                    updateItemState(id, { progress: Math.floor((processed / urls.length) * 100) });
                    appendLog(id, `解析成功: ${title.slice(0, 15)}...`);

                    return {
                        url,
                        title,
                        content: `### 外部链接: [${title}](${url})\n${content.slice(0, 5000)}`
                    };
                } catch (e) {
                    appendLog(id, `解析失败: ${url}`);
                    return null;
                }
            }));
            
            const validResults = results.filter(Boolean) as { url: string, title: string, content: string }[];
            
            if (validResults.length === 0) throw new Error("无法解析任何链接");

            const combined = `\n\n--- URL 引用集合 ---\n${validResults.map(r => r.content).join('\n\n')}\n--- 引用结束 ---\n`;
            const metaDetails = validResults.map(r => ({ title: r.title, url: r.url }));
            
            appendLog(id, `全部完成。`);
            updateItemState(id, { status: 'done', content: combined, details: metaDetails, progress: 100 });
            onUpdateReference(combined, "URL Import");
        } catch (e: any) {
            updateItemState(id, { status: 'error' });
            appendLog(id, `错误: ${e.message}`);
        } finally {
            setTimeout(() => setProcessingItemId(null), 1200);
        }
    };

    const activeProcessingItem = items.find(i => i.id === processingItemId);

    return (
        <div className="w-full max-w-4xl mx-auto mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Tools Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Search Card */}
                <button 
                    onClick={() => setIsSearchOpen(true)}
                    className="group bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-purple-400 hover:shadow-md transition-all text-left flex flex-col gap-2 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                         <GlobeIcon className="w-16 h-16 text-purple-600 transform rotate-12"/>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform z-10">
                        <SearchIcon className="w-6 h-6" />
                    </div>
                    <div className="z-10">
                        <h4 className="font-bold text-slate-700 text-sm">智能联网搜索</h4>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-mono font-bold">Google API</span>
                            <span className={`text-[10px] ${isCustomKey ? 'text-indigo-600 font-bold' : (quota.remaining > 0 ? 'text-green-600' : 'text-red-500')}`}>
                                {isCustomKey ? '无限制 (自定义 Key)' : `剩余: ${quota.remaining}/${DAILY_LIMIT}`}
                            </span>
                        </div>
                    </div>
                </button>

                {/* URL Card */}
                <button 
                    onClick={() => setIsUrlOpen(true)}
                    className="group bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all text-left flex flex-col gap-2 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                         <LinkIcon className="w-16 h-16 text-indigo-600 transform -rotate-12"/>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform z-10">
                        <LinkIcon className="w-6 h-6" />
                    </div>
                    <div className="z-10">
                        <h4 className="font-bold text-slate-700 text-sm">引用外部链接</h4>
                        <p className="text-xs text-slate-400 mt-1">Jina Reader 深度解析</p>
                    </div>
                </button>

                {/* File Upload Card */}
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="group bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all text-left flex flex-col gap-2 relative overflow-hidden"
                >
                     <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                         <CloudIcon className="w-16 h-16 text-blue-600"/>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform z-10">
                        <CloudIcon className="w-6 h-6" />
                    </div>
                    <div className="z-10">
                        <h4 className="font-bold text-slate-700 text-sm">上传参考文档</h4>
                        <p className="text-xs text-slate-400 mt-1">支持 .md, .txt, .csv, .pdf</p>
                    </div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        accept=".md,.txt,.csv,.json,.pdf"
                    />
                </button>
            </div>

            {/* Status List (Enhanced) */}
            {items.length > 0 && (
                <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-2 px-2">
                        <LightningBoltIcon className="w-4 h-4 text-amber-500" />
                        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">活跃任务与上下文</h5>
                    </div>
                    
                    {items.map(item => (
                        <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm transition-all hover:shadow-md">
                            {/* Item Header */}
                            <div 
                                className="flex items-center justify-between px-4 py-3 bg-slate-50/50 cursor-pointer"
                                onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="flex-shrink-0">
                                        {item.status === 'processing' ? (
                                            <div className="relative">
                                                <RefreshIcon className="w-5 h-5 text-indigo-500 animate-spin" />
                                                <div className="absolute inset-0 bg-indigo-500 rounded-full opacity-20 animate-ping"></div>
                                            </div>
                                        ) : item.status === 'done' ? (
                                            <CheckIcon className="w-5 h-5 text-green-500" />
                                        ) : (
                                            <CloseIcon className="w-5 h-5 text-red-500" />
                                        )}
                                    </div>
                                    
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-bold text-sm truncate ${item.status === 'error' ? 'text-red-500 line-through' : 'text-slate-800'}`}>
                                                {item.type === 'search' ? `搜索: ${item.name}` : item.name}
                                            </span>
                                            {item.details && item.details.length > 0 && (
                                                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded border border-green-200 font-mono font-bold">
                                                    {item.details.length} refs
                                                </span>
                                            )}
                                        </div>
                                        {item.status === 'processing' && (
                                             <div className="w-32 h-1 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                                                 <div 
                                                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                                                    style={{ width: `${item.progress}%` }}
                                                 ></div>
                                             </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${expandedItemId === item.id ? 'rotate-180' : ''}`} />
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                                        className="p-1.5 hover:bg-red-50 rounded text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            
                            {/* Expanded Area: Logs & Details */}
                            {expandedItemId === item.id && (
                                <div className="border-t border-slate-100 bg-white">
                                    {/* Tech Loader Logs (only if processing from expand, though mostly modal handles it) */}
                                    {item.status === 'processing' && item.logs && (
                                        <div className="p-4 bg-[#0f172a]">
                                            <TechLoader logs={item.logs} />
                                        </div>
                                    )}

                                    {/* Result List */}
                                    {item.details && item.details.length > 0 && (
                                        <div className="p-2 space-y-1 bg-slate-50/50">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1">有效引用来源</div>
                                            {item.details.map((detail, idx) => (
                                                <div key={idx} className="flex items-start gap-3 p-3 hover:bg-white hover:shadow-sm rounded-lg transition-all group border border-transparent hover:border-slate-100">
                                                    <div className="mt-0.5 bg-slate-100 p-1 rounded text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                                                        <ExternalLinkIcon className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <a 
                                                            href={detail.url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-xs font-bold text-slate-700 hover:text-indigo-600 block truncate"
                                                            title={detail.title}
                                                        >
                                                            {detail.title || detail.url}
                                                        </a>
                                                        <div className="text-[10px] text-slate-400 truncate font-mono mt-0.5">{detail.source || new URL(detail.url).hostname}</div>
                                                        {detail.snippet && <div className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{detail.snippet}</div>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Process Modal (Immersive) */}
            {activeProcessingItem && (
                <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-lg bg-[#0f172a] rounded-2xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col animate-in zoom-in-95">
                        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {activeProcessingItem.status === 'processing' ? (
                                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                                        <RefreshIcon className="w-5 h-5 text-indigo-400 animate-spin" />
                                    </div>
                                ) : (
                                    <div className="p-2 bg-green-500/10 rounded-lg">
                                        <CheckIcon className="w-5 h-5 text-green-400" />
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-slate-100 font-bold text-base">智能抓取中...</h3>
                                    <p className="text-slate-500 text-xs">AI 正在深度阅读并过滤无效信息</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6">
                             {/* Progress Bar */}
                            <div className="mb-6">
                                <div className="flex justify-between text-xs text-slate-400 mb-2">
                                    <span>处理进度</span>
                                    <span className="font-mono text-cyan-400">{activeProcessingItem.progress}%</span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
                                        style={{ width: `${activeProcessingItem.progress}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Logs */}
                            <TechLoader logs={activeProcessingItem.logs || []} />
                        </div>

                        {activeProcessingItem.status === 'error' && (
                             <div className="p-4 bg-red-900/20 text-red-400 text-xs text-center border-t border-red-900/50">
                                任务异常，请检查网络或重试。
                             </div>
                        )}
                    </div>
                </div>
            )}

            {/* Search Input Modal */}
            {isSearchOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-white/60 backdrop-blur-sm rounded-2xl">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 border border-slate-200 ring-1 ring-black/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <GlobeIcon className="w-32 h-32" />
                        </div>
                        
                        {isConfigMode ? (
                             <div className="relative z-10 animate-in fade-in slide-in-from-right-4">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <GearIcon className="w-5 h-5 text-slate-600"/> 搜索引擎配置
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">API Key</label>
                                        <input 
                                            type="password"
                                            value={config.apiKey}
                                            onChange={e => setConfig({...config, apiKey: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                            placeholder="AIza..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Search Engine ID (CX)</label>
                                        <input 
                                            value={config.cx}
                                            onChange={e => setConfig({...config, cx: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                            placeholder="0123456789..."
                                        />
                                        <div className="mt-1 text-[10px] text-slate-400">
                                            <a href="https://programmablesearchengine.google.com/controlpanel/create" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                                                点击此处创建搜索引擎 (CX)
                                            </a>
                                            ，需启用"搜索整个网络"。
                                        </div>
                                    </div>

                                    {/* Privacy Disclaimer */}
                                    <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-xs rounded-lg flex items-start gap-2 border border-blue-100">
                                        <ShieldCheckIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="font-bold mb-1">隐私安全提示</p>
                                            <p className="opacity-90 leading-relaxed">
                                                您的 API Key 和 CX ID 仅保存在您浏览器的本地存储 (Local Storage) 中，直接用于前端请求 Google 服务，不会上传至我们的服务器。
                                                使用自定义 Key 将解除每日搜索次数限制。
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 justify-end mt-4">
                                        <button onClick={() => setIsConfigMode(false)} className="px-4 py-2 text-slate-500 text-sm hover:bg-slate-100 rounded-lg">取消</button>
                                        <button onClick={() => saveConfig(config)} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700">保存配置</button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                        <GlobeIcon className="w-6 h-6 text-purple-600"/> 智能联网搜索
                                    </h3>
                                    <button onClick={() => setIsConfigMode(true)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="配置 API">
                                        <GearIcon className="w-5 h-5" />
                                    </button>
                                </div>
                                
                                <input 
                                    value={searchKeyword}
                                    onChange={e => setSearchKeyword(e.target.value)}
                                    placeholder="输入关键词 (e.g. 特斯拉 Robotaxi 最新进展)"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-base focus:ring-2 focus:ring-purple-500 outline-none mb-4 shadow-inner font-medium text-slate-800 placeholder:text-slate-400"
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                />
                                
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                        <ServerIcon className="w-3 h-3" />
                                        <span>Google Engine Ready</span>
                                        <span className={`font-bold ml-1 ${isCustomKey ? 'text-indigo-600' : (quota.remaining > 0 ? 'text-green-600' : 'text-red-500')}`}>
                                            {isCustomKey ? '(自定义 Key - 无限制)' : `(今日剩余: ${quota.remaining})`}
                                        </span>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setIsSearchOpen(false)} className="px-5 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-sm font-bold transition-colors">取消</button>
                                        <button 
                                            onClick={handleSearch} 
                                            className="px-8 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-purple-600 shadow-lg shadow-purple-500/20 transition-all transform active:scale-95 flex items-center gap-2"
                                        >
                                            <SearchIcon className="w-4 h-4" /> 开始搜索
                                        </button>
                                    </div>
                                </div>
                                
                                {!config.cx && (
                                    <div className="mt-4 p-2 bg-yellow-50 text-yellow-700 text-xs rounded border border-yellow-200 flex items-center gap-2">
                                        <ShieldExclamationIcon className="w-4 h-4" />
                                        提示：建议点击右上角齿轮配置自己的 Search Engine ID (CX)，以免超出默认配额。
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isUrlOpen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-white/60 backdrop-blur-sm rounded-2xl">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 border border-slate-200 ring-1 ring-black/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <LinkIcon className="w-32 h-32" />
                        </div>

                        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2 relative z-10">
                            <LinkIcon className="w-6 h-6 text-indigo-600"/> 批量引用链接
                        </h3>
                        
                        <div className="relative z-10">
                            <textarea 
                                value={urlInput}
                                onChange={e => setUrlInput(e.target.value)}
                                placeholder="请输入 URL，每行一个..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none mb-4 h-32 resize-none shadow-inner font-mono text-slate-600"
                                autoFocus
                            />
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setIsUrlOpen(false)} className="px-5 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-sm font-bold transition-colors">取消</button>
                                <button 
                                    onClick={handleUrlImport} 
                                    className="px-8 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all transform active:scale-95 flex items-center gap-2"
                                >
                                    <LightningBoltIcon className="w-4 h-4" /> 深度解析
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

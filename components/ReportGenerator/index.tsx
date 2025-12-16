// --- 阶段1: 创意输入 ---
const IdeaInput: React.FC<{ 
    onStart: (idea: string) => void, 
    isLoading: boolean,
    loadingText?: string,
    scenarios: string[],
    selectedScenario: string,
    onSelectScenario: (scenario: string) => void
}> = ({ onStart, isLoading, loadingText, scenarios, selectedScenario, onSelectScenario }) => {
    const [idea, setIdea] = useState('');

    return (
        <div className="flex flex-col items-center justify-start h-full overflow-y-auto pb-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="w-full max-w-3xl text-center px-4 mt-8 md:mt-16 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

                <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-100 shadow-sm animate-bounce">
                    <SparklesIcon className="w-3 h-3" />
                    <span>AI 智能报告生成引擎 V2.0</span>
                </div>

                <h1 className="text-4xl sm:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-indigo-800 to-slate-900 tracking-tight mb-6 leading-tight">
                    从一个想法<br/>到一份专业报告
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed mb-10">
                    输入您想要研究的主题，AI 将为您自动完成<span className="text-indigo-600 font-bold bg-indigo-50 px-1 rounded">全网调研</span>、<span className="text-purple-600 font-bold bg-purple-50 px-1 rounded">数据分析</span>与<span className="text-pink-600 font-bold bg-pink-50 px-1 rounded">逻辑构建</span>。
                </p>
                
                <div className="relative group max-w-2xl mx-auto">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[24px] opacity-25 group-hover:opacity-50 transition duration-500 blur-xl"></div>
                    <div className="relative bg-white rounded-[20px] shadow-2xl p-2 border border-slate-100">
                        <textarea
                            value={idea}
                            onChange={(e) => setIdea(e.target.value)}
                            placeholder="例如：‘2024年中国新能源汽车出海战略分析’ 或 ‘固态电池技术发展现状与商业化前景’"
                            className="w-full h-40 p-5 text-lg bg-transparent border-none resize-none focus:ring-0 text-slate-800 placeholder:text-slate-300 font-medium"
                            disabled={isLoading}
                        />
                        <div className="flex justify-between items-center px-4 pb-2">
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-slate-400 font-medium">支持中英文输入</span>
                                <div className="h-4 w-px bg-slate-200"></div>
                                <div className="flex items-center gap-1.5">
                                    <GearIcon className="w-3.5 h-3.5 text-slate-400" />
                                    <select 
                                        value={selectedScenario}
                                        onChange={(e) => onSelectScenario(e.target.value)}
                                        className="text-xs font-medium text-slate-600 bg-transparent outline-none cursor-pointer hover:text-indigo-600 transition-colors"
                                        disabled={isLoading}
                                    >
                                        {scenarios.map(sc => (
                                            <option key={sc} value={sc}>场景: {sc}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <button 
                                onClick={() => onStart(idea)}
                                disabled={!idea.trim() || isLoading}
                                className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-600 hover:shadow-indigo-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all flex items-center gap-2 group/btn"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></div>
                                        <span>{loadingText || '启动中...'}</span>
                                    </>
                                ) : (
                                    <>
                                        <SparklesIcon className="w-4 h-4 group-hover/btn:animate-ping" />
                                        <span>立即生成</span>
                                        <ArrowRightIcon className="w-4 h-4 ml-1 transition-transform group-hover/btn:translate-x-1" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-12 flex flex-wrap justify-center gap-3">
                    {['行业研究', '竞品分析', '技术洞察', '市场趋势', '政策解读'].map(tag => (
                        <span key={tag} onClick={() => setIdea(prev => tag + " ")} className="cursor-pointer px-4 py-1.5 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors shadow-sm">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};
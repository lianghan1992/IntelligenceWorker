                    <div className={`relative shadow-sm rounded-xl transition-all duration-300 ${isRedesignMode ? 'ring-2 ring-indigo-100' : ''}`}>
                        <input 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder={
                                stage === 'collect' ? "输入研报主题..." : 
                                (autoGenMode ? "正在生成中..." : 
                                (isRedesignMode ? "输入修改指令 (如: 把背景改成深蓝色...)" : "输入内容..."))
                            }
                            className="w-full bg-slate-50 text-slate-800 placeholder:text-slate-400 border border-slate-200 rounded-xl pl-4 pr-12 py-3.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            disabled={isLlmActive}
                        />
                        <button 
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isLlmActive}
                            className={`absolute right-2 top-2 p-1.5 text-white rounded-lg transition-all shadow-sm ${
                                isRedesignMode && input.trim() ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300'
                            }`}
                        >
                            {isLlmActive ? <RefreshIcon className="w-4 h-4 animate-spin"/> : <ArrowRightIcon className="w-4 h-4" />}
                        </button>
                    </div>
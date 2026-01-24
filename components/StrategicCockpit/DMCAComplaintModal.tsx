
import React from 'react';
import { CloseIcon, ShieldCheckIcon, DocumentTextIcon, ArrowRightIcon } from '../icons';

interface DMCAComplaintModalProps {
    onClose: () => void;
}

export const DMCAComplaintModal: React.FC<DMCAComplaintModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 border border-slate-200">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                            <ShieldCheckIcon className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">侵权投诉与版权保护</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    <section className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <DocumentTextIcon className="w-4 h-4 text-indigo-500" />
                            权利人保护声明
                        </h4>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Auto Insight 致力于保护知识产权。本平台展示的部分内容源自自动化网络采集，仅供行业研究参考。我们严格遵守《信息网络传播权保护条例》及 DMCA 相关精神。
                        </p>
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                            <p className="text-xs text-indigo-700 font-bold leading-relaxed">
                                承诺：在收到权利人提交的、符合法律要求的有效侵权通知后，我们将在核实后的第一时间（通常为 24 小时内）断开相关链接或删除侵权内容。
                            </p>
                        </div>
                    </section>

                    <section className="space-y-4 pt-4 border-t border-slate-100">
                        <h4 className="text-sm font-bold text-slate-900">投诉流程指引</h4>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0">01</div>
                                <div className="text-xs text-slate-500">准备权利证明文件及侵权内容链接。</div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0">02</div>
                                <div className="text-xs text-slate-500">发送正式投诉说明至版权邮箱：<span className="font-mono text-indigo-600 font-bold">compliance@autoinsight.com</span></div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0">03</div>
                                <div className="text-xs text-slate-500">系统将冻结该条情报并进入核实程序。</div>
                            </div>
                        </div>
                    </section>
                    
                    <div className="pt-2">
                        <button 
                            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-xl hover:bg-indigo-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                            onClick={() => alert('在线投诉系统正在升级中，目前请通过邮箱联系。')}
                        >
                            <span>提交在线申诉 (即将上线)</span>
                            <ArrowRightIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-center">
                     <p className="text-[10px] text-slate-400 font-medium">版权维护专线: 010-8888-XXXX</p>
                </div>
            </div>
        </div>
    );
};

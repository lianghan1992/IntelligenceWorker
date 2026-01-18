
import React, { ReactNode } from 'react';
import { CloseIcon } from '../icons';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | 'full';
    closeOnBackdrop?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    footer, 
    size = 'md',
    closeOnBackdrop = true 
}) => {
    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '4xl': 'max-w-4xl',
        'full': 'max-w-full m-4 h-[calc(100vh-2rem)]'
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="absolute inset-0" 
                onClick={closeOnBackdrop ? onClose : undefined}
            />
            <div 
                className={`bg-white rounded-2xl w-full ${sizeClasses[size]} shadow-2xl flex flex-col overflow-hidden border border-slate-200 relative z-10 animate-in zoom-in-95 duration-200`}
                role="dialog" 
                aria-modal="true"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                    <div className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        {title}
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                    >
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 relative">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

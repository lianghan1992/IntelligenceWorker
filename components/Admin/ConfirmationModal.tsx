

import React from 'react';
import { CloseIcon, ShieldExclamationIcon, StopIcon, QuestionMarkCircleIcon } from '../icons';

interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  variant?: 'destructive' | 'warning' | 'default';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  message,
  confirmText,
  cancelText = "取消",
  onConfirm,
  onCancel,
  isLoading = false,
  variant = 'destructive',
}) => {
  const config = {
    destructive: {
      confirmText: confirmText || '确认删除',
      confirmColorClass: 'bg-red-600 hover:bg-red-700 disabled:bg-red-300',
      Icon: ShieldExclamationIcon,
      iconColorClass: 'text-red-500 bg-red-100',
    },
    warning: {
      confirmText: confirmText || '确认',
      confirmColorClass: 'bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-black',
      Icon: StopIcon,
      iconColorClass: 'text-yellow-500 bg-yellow-100',
    },
    default: {
      confirmText: confirmText || '确认',
      confirmColorClass: 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300',
      Icon: QuestionMarkCircleIcon,
      iconColorClass: 'text-blue-500 bg-blue-100',
    }
  }[variant];


  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
      <div className="bg-white rounded-2xl w-full max-w-md relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
        <div className="p-6 text-center">
            <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${config.iconColorClass}`}>
                <config.Icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 id="confirmation-title" className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
            <p className="mt-2 text-sm text-gray-600">{message}</p>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 gap-2 sm:gap-0 rounded-b-2xl">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto justify-center inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`w-full sm:w-auto justify-center inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors ${config.confirmColorClass}`}
          >
            {isLoading ? '处理中...' : config.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
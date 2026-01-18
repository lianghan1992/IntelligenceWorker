
import React from 'react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { ShieldExclamationIcon, StopIcon, QuestionMarkCircleIcon } from '../icons';

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
  
  const getIcon = () => {
      switch(variant) {
          case 'destructive': return <ShieldExclamationIcon className="w-6 h-6 text-red-600" />;
          case 'warning': return <StopIcon className="w-6 h-6 text-yellow-600" />;
          default: return <QuestionMarkCircleIcon className="w-6 h-6 text-blue-600" />;
      }
  };

  const getButtonVariant = () => {
      switch(variant) {
          case 'destructive': return 'danger';
          case 'warning': return 'secondary'; // Or a yellow variant if added
          default: return 'primary';
      }
  };

  return (
    <Modal 
        isOpen={true} 
        onClose={onCancel} 
        size="sm"
        title={null} // Custom body layout
        footer={
            <div className="flex w-full gap-3">
                <Button variant="secondary" onClick={onCancel} disabled={isLoading} className="flex-1">
                    {cancelText}
                </Button>
                <Button 
                    variant={getButtonVariant()} 
                    onClick={onConfirm} 
                    isLoading={isLoading}
                    className="flex-1"
                >
                    {confirmText || '确认'}
                </Button>
            </div>
        }
    >
        <div className="text-center pt-2">
            <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full mb-4 ${
                variant === 'destructive' ? 'bg-red-100' : variant === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
            }`}>
                {getIcon()}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
                {message}
            </p>
        </div>
    </Modal>
  );
};

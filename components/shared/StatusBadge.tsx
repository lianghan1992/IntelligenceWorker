
import React from 'react';
import { CheckCircleIcon, ClockIcon, PlayIcon, ShieldExclamationIcon, StopIcon } from '../icons';

export type StatusType = 'completed' | 'success' | 'done' | 'paid' | 'active' | 'processing' | 'running' | 'analyzing' | 'generating_html' | 'pending' | 'waiting' | 'scheduled' | 'listening' | 'failed' | 'error' | 'rejected' | 'stopped' | 'disabled' | 'cancelled' | 'refunded';

interface StatusBadgeProps {
    status: string;
    text?: string; // Optional override text
    icon?: boolean; // Show icon
    animate?: boolean; // Allow animation
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, text, icon = true, animate = true }) => {
    const s = status.toLowerCase();
    
    // Normalize logic
    const isSuccess = ['completed', 'success', 'done', 'paid', 'active'].includes(s);
    const isProcessing = ['processing', 'running', 'analyzing', 'generating_html', 'recording', 'downloading'].includes(s);
    const isPending = ['pending', 'waiting', 'scheduled', 'listening'].includes(s);
    const isError = ['failed', 'error', 'rejected', 'stopped', 'disabled', 'cancelled', 'refunded'].includes(s);

    let styles = 'bg-gray-100 text-gray-600 border-gray-200';
    let Icon = ClockIcon;
    let shouldAnimate = false;

    if (isSuccess) {
        styles = 'bg-green-50 text-green-700 border-green-100';
        Icon = CheckCircleIcon;
    } else if (isProcessing) {
        styles = 'bg-blue-50 text-blue-700 border-blue-100';
        Icon = PlayIcon;
        shouldAnimate = animate;
    } else if (isPending) {
        styles = 'bg-yellow-50 text-yellow-700 border-yellow-100';
        Icon = ClockIcon;
    } else if (isError) {
        styles = 'bg-red-50 text-red-700 border-red-100';
        Icon = ShieldExclamationIcon;
    }

    // Special override for 'stopped' to look neutral/warning
    if (s === 'stopped' || s === 'disabled') {
        Icon = StopIcon;
    }

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles}`}>
            {icon && <Icon className={`w-3.5 h-3.5 ${shouldAnimate ? 'animate-pulse' : ''}`} />}
            <span className="uppercase tracking-wide">{text || status}</span>
        </span>
    );
};

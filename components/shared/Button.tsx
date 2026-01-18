
import React, { ButtonHTMLAttributes } from 'react';
import { Spinner } from './Spinner';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    isLoading = false, 
    icon,
    className = '',
    disabled,
    ...props 
}) => {
    const baseStyles = "inline-flex items-center justify-center font-bold transition-all rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95";
    
    const variants = {
        primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 focus:ring-indigo-500",
        secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 shadow-sm focus:ring-slate-200",
        danger: "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 focus:ring-red-500",
        ghost: "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800",
        outline: "bg-transparent border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50"
    };

    const sizes = {
        xs: "px-2 py-1 text-xs",
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base"
    };

    return (
        <button 
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <Spinner size={size === 'xs' ? 'sm' : 'md'} className="mr-2" />
            ) : icon ? (
                <span className="mr-1.5">{icon}</span>
            ) : null}
            {children}
        </button>
    );
};

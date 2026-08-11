import React from 'react';
import Spinner from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
}

const variants = {
    primary:
        'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500 disabled:bg-brand-800 disabled:text-brand-300',
    secondary:
        'bg-gray-800 text-gray-100 hover:bg-gray-700 focus-visible:ring-gray-500 disabled:bg-gray-850 disabled:text-gray-500',
    ghost:
        'bg-transparent text-gray-300 hover:bg-gray-800 focus-visible:ring-gray-500',
    danger:
        'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 disabled:bg-red-900 disabled:text-red-300',
};

const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2 text-sm rounded-lg',
    lg: 'px-6 py-3 text-base rounded-lg',
};

export default function Button({
    children,
    isLoading = false,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    disabled,
    className = '',
    ...props
}: ButtonProps) {
    const isDisabled = disabled || isLoading;

    return (
        <button
            disabled={isDisabled}
            className={[
                'inline-flex items-center justify-center gap-2 font-medium',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950',
                'disabled:cursor-not-allowed',
                variants[variant],
                sizes[size],
                fullWidth ? 'w-full' : '',
                className,
            ].join(' ')}
            aria-disabled={isDisabled}
            {...props}
        >
            {isLoading && <Spinner size="sm" />}
            {children}
        </button>
    );
}

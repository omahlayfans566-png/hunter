import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    hint?: string;
}

export default function Input({
    label,
    error,
    hint,
    id,
    className = '',
    ...props
}: InputProps) {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');

    return (
        <div className="flex flex-col gap-1.5">
            <label
                htmlFor={inputId}
                className="text-sm font-medium text-gray-300"
            >
                {label}
            </label>
            <input
                id={inputId}
                className={[
                    'w-full rounded-lg border bg-gray-900 px-3.5 py-2.5 text-sm text-gray-100',
                    'placeholder:text-gray-600',
                    'transition-colors duration-150',
                    'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
                    error
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-700 hover:border-gray-600',
                    className,
                ].join(' ')}
                aria-invalid={!!error}
                aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
                {...props}
            />
            {error && (
                <p id={`${inputId}-error`} className="text-xs text-red-400" role="alert">
                    {error}
                </p>
            )}
            {hint && !error && (
                <p id={`${inputId}-hint`} className="text-xs text-gray-500">
                    {hint}
                </p>
            )}
        </div>
    );
}

import React from 'react';

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    options: SelectOption[];
    placeholder?: string;
    error?: string;
}

export default function Select({
    label,
    options,
    placeholder = 'Select…',
    error,
    id,
    className = '',
    ...props
}: SelectProps) {
    const selectId = id ?? label.toLowerCase().replace(/\s+/g, '-');

    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={selectId} className="text-sm font-medium text-gray-300">
                {label}
            </label>
            <select
                id={selectId}
                className={[
                    'w-full rounded-lg border bg-gray-900 px-3.5 py-2.5 text-sm text-gray-100',
                    'transition-colors duration-150',
                    'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
                    error ? 'border-red-500' : 'border-gray-700 hover:border-gray-600',
                    className,
                ].join(' ')}
                aria-invalid={!!error}
                {...props}
            >
                <option value="">{placeholder}</option>
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
            {error && (
                <p className="text-xs text-red-400" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}

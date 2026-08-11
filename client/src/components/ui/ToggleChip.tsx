/**
 * A toggleable chip for multi-select groups (job types, work preferences, etc.)
 */
interface ToggleChipProps {
    label: string;
    selected: boolean;
    onToggle: () => void;
    disabled?: boolean;
}

export default function ToggleChip({ label, selected, onToggle, disabled = false }: ToggleChipProps) {
    return (
        <button
            type="button"
            onClick={onToggle}
            disabled={disabled}
            className={[
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                selected
                    ? 'bg-brand-600 border-brand-500 text-white'
                    : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200',
            ].join(' ')}
            aria-pressed={selected}
        >
            {label}
        </button>
    );
}

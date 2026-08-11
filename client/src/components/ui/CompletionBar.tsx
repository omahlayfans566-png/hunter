interface CompletionBarProps {
    percent: number; // 0–100
}

export default function CompletionBar({ percent }: CompletionBarProps) {
    const clamped = Math.max(0, Math.min(100, percent));

    const color =
        clamped < 40
            ? 'bg-red-500'
            : clamped < 70
                ? 'bg-yellow-500'
                : 'bg-green-500';

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium">Profile completion</span>
                <span className="text-xs font-bold text-gray-300">{clamped}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${color}`}
                    style={{ width: `${clamped}%` }}
                    role="progressbar"
                    aria-valuenow={clamped}
                    aria-valuemin={0}
                    aria-valuemax={100}
                />
            </div>
        </div>
    );
}

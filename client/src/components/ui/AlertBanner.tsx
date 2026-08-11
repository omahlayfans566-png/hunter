interface AlertBannerProps {
    type: 'error' | 'success' | 'info';
    message: string;
}

const styles = {
    error: 'bg-red-950 border-red-700 text-red-300',
    success: 'bg-green-950 border-green-700 text-green-300',
    info: 'bg-blue-950 border-blue-700 text-blue-300',
};

const icons = {
    error: '✕',
    success: '✓',
    info: 'ℹ',
};

export default function AlertBanner({ type, message }: AlertBannerProps) {
    return (
        <div
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${styles[type]}`}
            role="alert"
        >
            <span className="mt-0.5 font-semibold">{icons[type]}</span>
            <span>{message}</span>
        </div>
    );
}

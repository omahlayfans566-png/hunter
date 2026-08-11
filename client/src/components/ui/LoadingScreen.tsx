export default function LoadingScreen() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950">
            <div className="flex flex-col items-center gap-4">
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-4 border-brand-900" />
                    <div className="absolute inset-0 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
                </div>
                <p className="text-gray-400 text-sm font-medium">Loading…</p>
            </div>
        </div>
    );
}

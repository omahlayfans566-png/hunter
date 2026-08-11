import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
    return (
        <div className="min-h-screen bg-gray-950 flex flex-col">
            {/* Top brand bar */}
            <header className="px-6 py-5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">AI</span>
                </div>
                <span className="text-gray-100 font-semibold text-lg tracking-tight">
                    Job Hunter
                </span>
            </header>

            {/* Auth form area */}
            <main className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-md">
                    <Outlet />
                </div>
            </main>

            <footer className="px-6 py-4 text-center text-xs text-gray-600">
                AI Developer Job Hunter — Phase 1 Foundation
            </footer>
        </div>
    );
}

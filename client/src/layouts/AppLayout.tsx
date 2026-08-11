import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';

export default function AppLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [loggingOut, setLoggingOut] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    async function handleLogout() {
        setLoggingOut(true);
        try {
            await logout();
            navigate('/login');
        } finally {
            setLoggingOut(false);
        }
    }

    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        [
            'px-3 py-2 rounded-md text-sm font-medium transition-colors',
            isActive
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white',
        ].join(' ');

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col">
            {/* ── Header ───────────────────────────────────── */}
            <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Brand */}
                        <Link to="/dashboard" className="flex items-center gap-2.5 shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
                                <span className="text-white font-bold text-sm">AI</span>
                            </div>
                            <span className="text-gray-100 font-semibold text-base tracking-tight hidden sm:block">
                                Job Hunter
                            </span>
                        </Link>

                        {/* Desktop nav */}
                        <nav className="hidden md:flex items-center gap-1">
                            <NavLink to="/dashboard" className={navLinkClass}>
                                Dashboard
                            </NavLink>
                            <NavLink to="/profile" className={navLinkClass}>
                                Profile
                            </NavLink>
                        </nav>

                        {/* Right side */}
                        <div className="flex items-center gap-3">
                            {/* User name */}
                            <span className="hidden sm:block text-sm text-gray-400">
                                {user?.firstName} {user?.lastName}
                            </span>

                            {/* Logout */}
                            <Button
                                variant="ghost"
                                size="sm"
                                isLoading={loggingOut}
                                onClick={handleLogout}
                                className="text-gray-400 hover:text-red-400"
                            >
                                {!loggingOut && 'Log out'}
                            </Button>

                            {/* Mobile menu toggle */}
                            <button
                                className="md:hidden p-2 rounded-md text-gray-400 hover:bg-gray-800"
                                onClick={() => setMenuOpen((v) => !v)}
                                aria-label="Toggle menu"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {menuOpen ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Mobile nav drawer */}
                    {menuOpen && (
                        <nav className="md:hidden py-3 border-t border-gray-800 flex flex-col gap-1">
                            <NavLink
                                to="/dashboard"
                                className={navLinkClass}
                                onClick={() => setMenuOpen(false)}
                            >
                                Dashboard
                            </NavLink>
                            <NavLink
                                to="/profile"
                                className={navLinkClass}
                                onClick={() => setMenuOpen(false)}
                            >
                                Profile
                            </NavLink>
                        </nav>
                    )}
                </div>
            </header>

            {/* ── Page content ──────────────────────────────── */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet />
            </main>

            <footer className="border-t border-gray-800 px-6 py-4 text-center text-xs text-gray-700">
                AI Developer Job Hunter — Phase 1
            </footer>
        </div>
    );
}

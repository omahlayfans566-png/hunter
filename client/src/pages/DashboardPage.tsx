import { useAuth } from '../context/AuthContext';

interface PhaseCard {
    phase: string;
    title: string;
    description: string;
    eta: string;
    icon: string;
}

const UPCOMING_PHASES: PhaseCard[] = [
    {
        phase: 'Phase 3',
        title: 'GitHub Intelligence',
        description: 'Analyse your GitHub activity, repositories, and languages to build a developer profile.',
        eta: 'Coming in Phase 3',
        icon: '⬡',
    },
    {
        phase: 'Phase 4',
        title: 'Job Discovery',
        description: 'Automatically discover real software development jobs and gigs from legitimate sources worldwide.',
        eta: 'Coming in Phase 4',
        icon: '⊕',
    },
    {
        phase: 'Phase 6',
        title: 'AI Matching',
        description: 'AI-powered matching between your skills and job requirements to surface the best opportunities.',
        eta: 'Coming in Phase 6',
        icon: '◈',
    },
    {
        phase: 'Phase 7',
        title: 'Applications',
        description: 'Track every application, cover letter, and interview in one place.',
        eta: 'Coming in Phase 7',
        icon: '▣',
    },
];

export default function DashboardPage() {
    const { user } = useAuth();

    return (
        <div className="space-y-8">
            {/* ── Hero ─────────────────────────────────────── */}
            <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 px-6 py-8 sm:px-8 sm:py-10">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center shrink-0">
                        <span className="text-white font-bold text-lg">AI</span>
                    </div>
                    <div>
                        <p className="text-brand-400 text-sm font-medium mb-1 font-mono">PHASE 1 — FOUNDATION</p>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-2">
                            Your Developer Job Hunter
                        </h1>
                        <p className="text-gray-400 text-base">
                            Welcome back,{' '}
                            <span className="text-gray-200 font-medium">
                                {user?.firstName} {user?.lastName}
                            </span>
                            . Your personal job discovery workspace is ready.
                        </p>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'Jobs Found', value: '—' },
                        { label: 'Saved Jobs', value: '—' },
                        { label: 'Applications', value: '—' },
                        { label: 'Matches', value: '—' },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="bg-gray-900/60 rounded-xl px-4 py-3 text-center border border-gray-700/50"
                        >
                            <p className="text-2xl font-bold text-gray-300 font-mono">{stat.value}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Upcoming feature cards ────────────────────── */}
            <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    Coming in future phases
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {UPCOMING_PHASES.map((card) => (
                        <div
                            key={card.phase}
                            className="rounded-xl border border-gray-800 bg-gray-900 p-5 flex flex-col gap-3 opacity-70 hover:opacity-90 transition-opacity"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl text-gray-600">{card.icon}</span>
                                <div>
                                    <p className="text-xs font-mono text-gray-600 uppercase tracking-wide">
                                        {card.phase}
                                    </p>
                                    <h3 className="text-gray-300 font-semibold text-sm">{card.title}</h3>
                                </div>
                            </div>
                            <p className="text-gray-500 text-sm leading-relaxed">{card.description}</p>
                            <span className="mt-auto self-start text-xs px-2.5 py-1 rounded-full bg-gray-800 text-gray-600 font-mono border border-gray-700">
                                {card.eta}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

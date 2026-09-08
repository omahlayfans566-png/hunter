import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getJobStats, triggerIngestion, getSavedJobs } from '../services/job.service';
import { applicationService } from '../services/application.service';
import { JobStats } from '../types';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';

interface AppStats {
    total: number;
    thisWeek: number;
    interviews: number;
    offers: number;
}

export default function DashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [keyword, setKeyword] = useState('');
    const [jobStats, setJobStats] = useState<JobStats | null>(null);
    const [savedCount, setSavedCount] = useState<number | null>(null);
    const [appStats, setAppStats] = useState<AppStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [ingesting, setIngesting] = useState(false);
    const [ingestMsg, setIngestMsg] = useState('');

    useEffect(() => {
        async function loadStats() {
            setStatsLoading(true);
            try {
                const [js, saved, apps] = await Promise.allSettled([
                    getJobStats(),
                    getSavedJobs(),
                    applicationService.getStats(),
                ]);
                if (js.status === 'fulfilled') setJobStats(js.value);
                if (saved.status === 'fulfilled') setSavedCount(saved.value.total);
                if (apps.status === 'fulfilled') setAppStats(apps.value as AppStats);
            } finally {
                setStatsLoading(false);
            }
        }
        loadStats();
    }, []);

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        const q = keyword.trim();
        navigate(q ? `/jobs?keyword=${encodeURIComponent(q)}` : '/jobs');
    }

    async function handleIngest() {
        setIngesting(true);
        setIngestMsg('');
        try {
            const res = await triggerIngestion();
            setIngestMsg(`✓ Found ${res.summary.totalNew} new jobs (${res.summary.totalFetched} fetched, ${res.summary.totalDupes} dupes merged)`);
            const js = await getJobStats();
            setJobStats(js);
        } catch (e) {
            setIngestMsg(e instanceof Error ? `⚠ ${e.message}` : 'Ingestion failed.');
        } finally {
            setIngesting(false);
        }
    }

    const stats = [
        {
            label: 'Active Jobs',
            value: statsLoading ? '…' : (jobStats?.active ?? 0).toLocaleString(),
            sub: jobStats ? `${jobStats.today} new today` : '',
            color: 'text-brand-400',
            link: '/jobs',
        },
        {
            label: 'Remote Jobs',
            value: statsLoading ? '…' : (jobStats?.remote ?? 0).toLocaleString(),
            sub: 'worldwide remote',
            color: 'text-green-400',
            link: '/jobs?remote=true',
        },
        {
            label: 'Saved Jobs',
            value: statsLoading ? '…' : (savedCount ?? 0).toLocaleString(),
            sub: 'in your list',
            color: 'text-yellow-400',
            link: '/jobs/saved',
        },
        {
            label: 'Applications',
            value: statsLoading ? '…' : (appStats?.total ?? 0).toLocaleString(),
            sub: appStats ? `${appStats.interviews} interviews` : '',
            color: 'text-purple-400',
            link: '/applications',
        },
    ];

    return (
        <div className="space-y-8">
            {/* ── Hero ───────────────────────────────────────── */}
            <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 px-6 py-8 sm:px-8 sm:py-10">
                <div className="flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center shrink-0">
                        <span className="text-white font-bold text-lg">AI</span>
                    </div>
                    <div>
                        <p className="text-brand-400 text-sm font-medium mb-1 font-mono tracking-wide">
                            AI JOB HUNTER
                        </p>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-1">
                            Welcome back, {user?.firstName}
                        </h1>
                        <p className="text-gray-400 text-sm">
                            Your personal developer job discovery workspace — real jobs from multiple sources worldwide.
                        </p>
                    </div>
                </div>

                {/* Quick search */}
                <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                    <input
                        type="text"
                        placeholder="Search jobs — e.g. React developer, remote…"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="flex-1 rounded-lg border border-gray-600 bg-gray-800/80 px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <Button type="submit" size="sm" className="shrink-0">
                        Search
                    </Button>
                </form>

                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {stats.map((s) => (
                        <Link
                            key={s.label}
                            to={s.link}
                            className="bg-gray-900/60 rounded-xl px-4 py-3 border border-gray-700/50 hover:border-brand-700 transition-colors group"
                        >
                            <p className={`text-2xl font-bold font-mono ${s.color} group-hover:scale-105 transition-transform inline-block`}>
                                {statsLoading ? <Spinner size="sm" className="text-gray-600" /> : s.value}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                            {s.sub && <p className="text-[10px] text-gray-600 mt-0.5">{s.sub}</p>}
                        </Link>
                    ))}
                </div>
            </div>

            {/* ── Actions ────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="col-span-1 sm:col-span-2 rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-3">
                    <h2 className="text-sm font-semibold text-gray-300">Fetch New Jobs</h2>
                    <p className="text-xs text-gray-500 leading-relaxed">
                        Search all connected sources — Arbeitnow, Remotive, The Muse, Jobicy, RemoteOK, Greenhouse, Lever and more — for the latest developer jobs. New jobs are deduplicated automatically.
                    </p>
                    <Button
                        onClick={handleIngest}
                        isLoading={ingesting}
                        variant="secondary"
                        size="sm"
                        className="w-full sm:w-auto"
                    >
                        {ingesting ? 'Searching all sources…' : '🔍 Search for New Jobs'}
                    </Button>
                    {ingestMsg && (
                        <p className={`text-xs mt-1 ${ingestMsg.startsWith('⚠') ? 'text-red-400' : 'text-green-400'}`}>
                            {ingestMsg}
                        </p>
                    )}
                </div>

                <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-3 flex flex-col">
                    <h2 className="text-sm font-semibold text-gray-300">Quick Links</h2>
                    <div className="space-y-2 flex-1">
                        {[
                            { to: '/jobs', label: '🌍 Browse All Jobs' },
                            { to: '/jobs?remote=true', label: '💻 Remote Jobs Only' },
                            { to: '/applications', label: '📋 My Applications' },
                            { to: '/profile', label: '👤 Edit My Profile' },
                        ].map((l) => (
                            <Link
                                key={l.to}
                                to={l.to}
                                className="block text-xs text-gray-400 hover:text-brand-300 hover:translate-x-0.5 transition-all py-0.5"
                            >
                                {l.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Source overview ─────────────────────────────── */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <h2 className="text-sm font-semibold text-gray-300 mb-3">Connected Job Sources</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {[
                        { name: 'Arbeitnow', desc: 'EU & Remote tech', free: true },
                        { name: 'Remotive', desc: 'Remote-only global', free: true },
                        { name: 'The Muse', desc: 'Engineering roles', free: true },
                        { name: 'Jobicy', desc: 'Remote developer jobs', free: true },
                        { name: 'RemoteOK', desc: 'Worldwide remote', free: true },
                        { name: 'Greenhouse', desc: 'Top tech companies', free: true },
                        { name: 'Lever', desc: 'Tech company boards', free: true },
                        { name: 'Adzuna', desc: '16+ countries', free: false },
                        { name: 'USAJobs', desc: 'US government jobs', free: false },
                    ].map((src) => (
                        <div key={src.name} className="rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5">
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${src.free ? 'bg-green-400' : 'bg-yellow-400'}`} />
                                <span className="text-xs font-medium text-gray-300">{src.name}</span>
                            </div>
                            <p className="text-[10px] text-gray-600">{src.desc}</p>
                            {!src.free && <p className="text-[10px] text-yellow-600 mt-0.5">API key needed</p>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

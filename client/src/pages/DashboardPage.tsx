import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getJobStats, triggerIngestion, getSavedJobs, getTopMatches } from '../services/job.service';
import { applicationService } from '../services/application.service';
import { Job, JobStats, REMOTE_TYPE_LABELS, SALARY_PERIOD_LABELS } from '../types';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';

interface AppStats {
    total: number;
    thisWeek: number;
    interviews: number;
    offers: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────
function formatDate(d: string | null) {
    if (!d) return null;
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (diff < 60) return `${Math.max(1, diff)}m ago`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function salaryStr(job: Job) {
    if (!job.salaryMin && !job.salaryMax) return job.salaryRaw ?? null;
    const c = job.salaryCurrency ?? '';
    const p = job.salaryPeriod ? ` ${SALARY_PERIOD_LABELS[job.salaryPeriod]}` : '';
    if (job.salaryMin && job.salaryMax)
        return `${c} ${job.salaryMin.toLocaleString()}–${job.salaryMax.toLocaleString()}${p}`;
    return null;
}

// ── Top Match card ────────────────────────────────────────────────────────
function TopMatchCard({ job }: { job: Job }) {
    const score = job.matchScore ?? 0;
    const scoreColor =
        score >= 80 ? 'text-green-400' :
            score >= 60 ? 'text-brand-400' :
                'text-gray-400';
    const posted = formatDate(job.postedAt);
    const salary = salaryStr(job);
    const remote = job.remoteType !== 'UNKNOWN' ? REMOTE_TYPE_LABELS[job.remoteType] : null;

    return (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 flex gap-4 hover:border-brand-700 transition-colors">
            {/* Score circle */}
            <div className="shrink-0 w-12 h-12 rounded-full border-2 border-gray-700 flex flex-col items-center justify-center">
                <span className={`text-sm font-bold font-mono leading-none ${scoreColor}`}>
                    {score}
                </span>
                <span className="text-[9px] text-gray-600 leading-none mt-0.5">%</span>
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 space-y-1">
                <h3 className="text-sm font-semibold text-gray-100 line-clamp-1">{job.title}</h3>
                <p className="text-xs text-gray-400 truncate">{job.companyName}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                    {remote && <span>{remote}</span>}
                    {job.country && <span>🌐 {job.country}</span>}
                    {salary && <span className="text-green-400">{salary}</span>}
                    {posted && <span>{posted}</span>}
                </div>
            </div>

            {/* Action */}
            <Link
                to={`/jobs/${job.id}`}
                className="shrink-0 self-center text-xs text-brand-400 hover:text-brand-300 font-medium"
            >
                View →
            </Link>
        </div>
    );
}

// ── Location shortcuts ────────────────────────────────────────────────────
const LOCATION_SHORTCUTS = [
    { flag: '🇳🇬', label: 'Nigeria', to: '/jobs?country=Nigeria' },
    { flag: '🇬🇧', label: 'UK', to: '/jobs?country=United+Kingdom' },
    { flag: '🇺🇸', label: 'USA', to: '/jobs?country=United+States' },
    { flag: '🇨🇦', label: 'Canada', to: '/jobs?country=Canada' },
    { flag: '💻', label: 'Remote', to: '/jobs?remote=true' },
];

// ── Page ──────────────────────────────────────────────────────────────────
export default function DashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [keyword, setKeyword] = useState('');
    const [jobStats, setJobStats] = useState<JobStats | null>(null);
    const [savedCount, setSavedCount] = useState<number | null>(null);
    const [appStats, setAppStats] = useState<AppStats | null>(null);
    const [topMatches, setTopMatches] = useState<Job[]>([]);
    const [statsLoading, setStatsLoading] = useState(true);
    const [matchLoading, setMatchLoading] = useState(true);
    const [ingesting, setIngesting] = useState(false);
    const [ingestMsg, setIngestMsg] = useState('');

    useEffect(() => {
        // Load stats
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

        // Load top matches
        async function loadTopMatches() {
            setMatchLoading(true);
            try {
                const matches = await getTopMatches(8);
                setTopMatches(matches);
            } catch {
                // Non-critical — dashboard still works without matches
            } finally {
                setMatchLoading(false);
            }
        }

        loadStats();
        loadTopMatches();
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
            setIngestMsg(
                `✓ ${res.summary.totalNew} new jobs found ` +
                `(${res.summary.totalFetched} fetched, ${res.summary.totalDupes} dupes merged)`
            );
            const [js, matches] = await Promise.allSettled([getJobStats(), getTopMatches(8)]);
            if (js.status === 'fulfilled') setJobStats(js.value);
            if (matches.status === 'fulfilled') setTopMatches(matches.value);
        } catch (e) {
            setIngestMsg(e instanceof Error ? `⚠ ${e.message}` : 'Search failed.');
        } finally {
            setIngesting(false);
        }
    }

    // ── Stat cards ────────────────────────────────────────────────────────
    const statCards = [
        {
            label: 'Active Jobs',
            value: statsLoading ? null : (jobStats?.active ?? 0).toLocaleString(),
            sub: jobStats ? `${jobStats.today} new today` : '',
            color: 'text-brand-400',
            link: '/jobs',
        },
        {
            label: 'Remote Jobs',
            value: statsLoading ? null : (jobStats?.remote ?? 0).toLocaleString(),
            sub: 'worldwide',
            color: 'text-green-400',
            link: '/jobs?remote=true',
        },
        {
            label: 'Saved Jobs',
            value: statsLoading ? null : (savedCount ?? 0).toLocaleString(),
            sub: 'in your list',
            color: 'text-yellow-400',
            link: '/jobs/saved',
        },
        {
            label: 'Applications',
            value: statsLoading ? null : (appStats?.total ?? 0).toLocaleString(),
            sub: appStats ? `${appStats.interviews} interviews` : '',
            color: 'text-purple-400',
            link: '/applications',
        },
    ];

    return (
        <div className="space-y-8">
            {/* ── Hero ──────────────────────────────────────────── */}
            <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 px-6 py-8 sm:px-8">
                <div className="flex items-start gap-4 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center shrink-0">
                        <span className="text-white font-bold text-lg">AI</span>
                    </div>
                    <div>
                        <p className="text-brand-400 text-xs font-medium font-mono tracking-widest uppercase mb-1">
                            AI Job Hunter
                        </p>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 mb-1">
                            Welcome back, {user?.firstName}
                        </h1>
                        <p className="text-gray-400 text-sm">
                            Real developer jobs · Nigeria · UK · USA · Worldwide Remote
                        </p>
                    </div>
                </div>

                {/* Quick search */}
                <form onSubmit={handleSearch} className="flex gap-2 mb-5">
                    <input
                        type="text"
                        placeholder="Search — e.g. React developer Lagos, Frontend London…"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="flex-1 rounded-lg border border-gray-600 bg-gray-800/80 px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <Button type="submit" size="sm" className="shrink-0">Search</Button>
                </form>

                {/* Location shortcuts */}
                <div className="flex flex-wrap gap-2 mb-5">
                    {LOCATION_SHORTCUTS.map((s) => (
                        <Link
                            key={s.label}
                            to={s.to}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800/60 text-xs text-gray-300 hover:border-brand-600 hover:text-white transition-colors"
                        >
                            <span>{s.flag}</span>
                            <span>{s.label}</span>
                        </Link>
                    ))}
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {statCards.map((s) => (
                        <Link
                            key={s.label}
                            to={s.link}
                            className="bg-gray-900/60 rounded-xl px-4 py-3 border border-gray-700/50 hover:border-brand-700 transition-colors group"
                        >
                            <p className={`text-2xl font-bold font-mono ${s.color} group-hover:scale-105 transition-transform inline-block`}>
                                {s.value === null
                                    ? <Spinner size="sm" className="text-gray-600" />
                                    : s.value}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                            {s.sub && <p className="text-[10px] text-gray-600 mt-0.5">{s.sub}</p>}
                        </Link>
                    ))}
                </div>
            </div>

            {/* ── Top Matches ───────────────────────────────────── */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-gray-200">
                            ⭐ Top Matches For You
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Ranked by how well each job matches your skills, location, and preferences
                        </p>
                    </div>
                    <Link
                        to="/jobs?sortBy=relevance"
                        className="text-xs text-brand-400 hover:text-brand-300"
                    >
                        View all →
                    </Link>
                </div>

                {matchLoading ? (
                    <div className="flex justify-center py-8">
                        <Spinner size="md" className="text-brand-500" />
                    </div>
                ) : topMatches.length === 0 ? (
                    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center">
                        <p className="text-gray-500 text-sm mb-3">
                            No matches yet — search for jobs first, then complete your profile to see personalised rankings.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button size="sm" isLoading={ingesting} onClick={handleIngest} variant="secondary">
                                {ingesting ? 'Searching…' : '🔍 Find Jobs'}
                            </Button>
                            <Link to="/profile">
                                <Button size="sm" variant="ghost">Edit Profile</Button>
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {topMatches.map((job) => (
                            <TopMatchCard key={job.id} job={job} />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Actions row ───────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Fetch new jobs */}
                <div className="col-span-1 sm:col-span-2 rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-3">
                    <h2 className="text-sm font-semibold text-gray-300">Fetch New Jobs</h2>
                    <p className="text-xs text-gray-500 leading-relaxed">
                        Search all 11 connected sources concurrently — Arbeitnow, Remotive, Jobicy,
                        RemoteOK, AfricanJobs 🇳🇬, Jooble, Greenhouse, Lever, and more.
                        Duplicates are merged automatically.
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
                        <p className={`text-xs ${ingestMsg.startsWith('⚠') ? 'text-red-400' : 'text-green-400'}`}>
                            {ingestMsg}
                        </p>
                    )}
                </div>

                {/* Quick links */}
                <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-2">
                    <h2 className="text-sm font-semibold text-gray-300 mb-3">Quick Links</h2>
                    {[
                        { to: '/jobs', label: '🌍 Browse All Jobs' },
                        { to: '/jobs?country=Nigeria', label: '🇳🇬 Nigeria Jobs' },
                        { to: '/jobs?remote=true', label: '💻 Remote Jobs' },
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

            {/* ── Connected Sources ─────────────────────────────── */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <h2 className="text-sm font-semibold text-gray-300 mb-3">
                    Connected Job Sources (11)
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2">
                    {[
                        { name: 'Arbeitnow', desc: 'EU & remote tech', free: true },
                        { name: 'Remotive', desc: 'Remote-only global', free: true },
                        { name: 'The Muse', desc: 'Engineering roles', free: true },
                        { name: 'Jobicy', desc: 'Remote developer jobs', free: true },
                        { name: 'RemoteOK', desc: 'Worldwide remote', free: true },
                        { name: 'AfricanJobs', desc: '🇳🇬 Nigeria — Jobberman + MyJobMag', free: true },
                        { name: 'Jooble', desc: 'Nigeria, UK, USA, Remote', free: false, key: 'JOOBLE_API_KEY' },
                        { name: 'Greenhouse', desc: '30 top tech companies', free: true },
                        { name: 'Lever', desc: '15 remote-first companies', free: true },
                        { name: 'Adzuna', desc: '16 countries (UK, USA…)', free: false, key: 'ADZUNA_APP_ID + KEY' },
                        { name: 'USAJobs', desc: 'US government jobs', free: false, key: 'USAJOBS_EMAIL + KEY' },
                    ].map((src) => (
                        <div
                            key={src.name}
                            className="rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2.5"
                        >
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${src.free ? 'bg-green-400' : 'bg-yellow-400'}`} />
                                <span className="text-xs font-medium text-gray-300 truncate">{src.name}</span>
                            </div>
                            <p className="text-[10px] text-gray-600 leading-snug">{src.desc}</p>
                            {!src.free && src.key && (
                                <p className="text-[9px] text-yellow-600 mt-0.5 font-mono truncate">{src.key}</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

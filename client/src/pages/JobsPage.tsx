import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { searchJobs, getJobStats, triggerIngestion, getSourceHealth, getCountries } from '../services/job.service';
import { Job, JobStats, JobSearchResponse, RemoteType, REMOTE_TYPE_LABELS, SALARY_PERIOD_LABELS, SourceHealth, SourceStatus, JobFilters } from '../types';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import AlertBanner from '../components/ui/AlertBanner';

const SOURCE_LABELS: Record<string, string> = {
    arbeitnow: 'Arbeitnow', themuse: 'The Muse', remotive: 'Remotive',
    jobicy: 'Jobicy', remoteok: 'RemoteOK', adzuna: 'Adzuna',
    usajobs: 'USAJobs', greenhouse: 'Greenhouse', lever: 'Lever',
};
function sourceLabel(s: string) { return SOURCE_LABELS[s] ?? s.charAt(0).toUpperCase() + s.slice(1); }

function formatDate(d: string | null) {
    if (!d) return 'Unknown';
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (diff < 60) return `${Math.max(1, diff)}m ago`;
    const h = Math.floor(diff / 60); if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    if (days < 1) return 'Today'; if (days === 1) return 'Yesterday'; if (days < 7) return `${days}d ago`;
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function salaryStr(job: Job) {
    if (!job.salaryMin && !job.salaryMax) return job.salaryRaw ?? null;
    const c = job.salaryCurrency ?? ''; const p = job.salaryPeriod ? ` ${SALARY_PERIOD_LABELS[job.salaryPeriod]}` : '';
    if (job.salaryMin && job.salaryMax) return `${c} ${job.salaryMin.toLocaleString()}–${job.salaryMax.toLocaleString()}${p}`;
    if (job.salaryMin) return `${c} ${job.salaryMin.toLocaleString()}+${p}`; return null;
}

function RemoteBadge({ type }: { type: RemoteType }) {
    if (type === 'UNKNOWN') return null;
    const cls: Record<string, string> = { REMOTE: 'bg-green-900/40 text-green-300 border-green-700', HYBRID: 'bg-yellow-900/40 text-yellow-300 border-yellow-700', ON_SITE: 'bg-gray-800 text-gray-400 border-gray-700' };
    return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cls[type] ?? ''}`}>{REMOTE_TYPE_LABELS[type]}</span>;
}

function JobCard({ job }: { job: Job }) {
    const salary = salaryStr(job);
    return (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 hover:border-brand-700 transition-all space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-100 line-clamp-2">{job.title}</h3>
                    <p className="text-sm text-gray-400 mt-0.5 truncate">{job.companyName}</p>
                </div>
                <RemoteBadge type={job.remoteType} />
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                {job.location && <span>📍 {job.location}</span>}
                {job.country && <span className="text-gray-400">🌐 {job.country}</span>}
                {job.employmentType && <span>💼 {job.employmentType}</span>}
                {salary && <span className="text-green-400">💰 {salary}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-brand-900/40 text-brand-300 border border-brand-800">
                    {sourceLabel(job.source)}
                </span>
                {(job.verificationStatus === 'ACTIVE' || (job.lastVerifiedAt ?? null)) ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-900/40 text-green-300 border border-green-700">ACTIVE</span>
                ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-500 border border-gray-700">Unverified</span>
                )}
                {(job.matchScore ?? 0) > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/40 text-indigo-300 border border-indigo-800">Match {job.matchScore}%</span>
                )}
                <span className="text-[10px] text-gray-600 ml-auto">{formatDate(job.postedAt)}</span>
            </div>
            <div className="flex gap-2 pt-1">
                <Link to={`/jobs/${job.id}`} className="flex-1">
                    <Button size="sm" className="w-full">View Job</Button>
                </Link>
                {job.applicationUrl && (
                    <a href={job.applicationUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <Button variant="secondary" size="sm" className="w-full">Apply</Button>
                    </a>
                )}
            </div>
        </div>
    );
}

function SourcePanel({ health, sources }: { health: SourceHealth[]; sources: SourceStatus[] }) {
    const healthMap = new Map(health.map((h) => [h.sourceName, h]));
    return (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Source Status</h3>
            <div className="space-y-2">
                {sources.map((s) => {
                    const h = healthMap.get(s.sourceName);
                    const dot = s.status === 'WORKING' ? 'bg-green-400' : s.status === 'CONFIG_REQUIRED' ? 'bg-yellow-400' : 'bg-red-400';
                    return (
                        <div key={s.sourceName} className="flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                                <span className="text-gray-300 font-medium">{sourceLabel(s.sourceName)}</span>
                                {s.requiresConfig && <span className="text-yellow-500 text-[10px]">needs config</span>}
                            </div>
                            {h && <span className="text-gray-600 shrink-0">{h.jobsActive ?? 0} active</span>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function JobsPage() {
    const [keyword, setKeyword] = useState('');
    const [remote, setRemote] = useState<boolean | undefined>(undefined);
    const [country, setCountry] = useState('');
    const [source, setSource] = useState('');
    const [newToday, setNewToday] = useState(false);
    const [activeNow, setActiveNow] = useState(false);
    const [postedWithin, setPostedWithin] = useState<number | undefined>(undefined);
    const [sortBy, setSortBy] = useState<'relevance' | 'newest' | 'oldest'>('relevance');
    const [page, setPage] = useState(1);
    const [data, setData] = useState<JobSearchResponse | null>(null);
    const [stats, setStats] = useState<JobStats | null>(null);
    const [countries, setCountries] = useState<string[]>([]);
    const [health, setHealth] = useState<{ health: SourceHealth[]; sources: SourceStatus[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [ingesting, setIngesting] = useState(false);
    const [error, setError] = useState('');
    const [ingestMsg, setIngestMsg] = useState('');
    const [showSources, setShowSources] = useState(false);
    const timerRef = useRef<number | null>(null);

    async function load(f: Partial<JobFilters> & { page?: number } = {}) {
        setLoading(true); setError('');
        try {
            const res = await searchJobs({ keyword: keyword || undefined, remote, country: country || undefined, source: source || undefined, newToday, activeNow, postedWithin, sortBy, page, limit: 20, ...f });
            setData(res);
            if (f.page !== undefined) setPage(f.page);
        } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load jobs.'); }
        finally { setLoading(false); }
    }

    function go(f: Partial<JobFilters> = {}) { load({ ...f, page: 1 }); }

    useEffect(() => {
        load();
        getJobStats().then(setStats).catch(() => { });
        getSourceHealth().then(setHealth).catch(() => { });
        getCountries().then((c) => setCountries(c.filter(Boolean) as string[])).catch(() => { });
        return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function handleKeyword(v: string) {
        setKeyword(v);
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => go({ keyword: v || undefined }), 450);
    }

    async function handleIngest() {
        setIngesting(true); setIngestMsg('');
        try {
            const res = await triggerIngestion();
            setIngestMsg(`Fetched ${res.summary.totalFetched} — ${res.summary.totalNew} new, ${res.summary.totalDupes} dupes merged.`);
            getJobStats().then(setStats).catch(() => { });
            getSourceHealth().then(setHealth).catch(() => { });
            go();
        } catch (e) { setIngestMsg(e instanceof Error ? e.message : 'Ingestion failed.'); }
        finally { setIngesting(false); }
    }

    const sourcesConnected = health?.sources.filter((s) => s.status === 'WORKING').length ?? 0;
    const total = data?.pagination.total ?? 0;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-100">Job Discovery</h1>
                    <p className="text-gray-500 text-sm mt-0.5">
                        {total > 0 ? `${total.toLocaleString()} active jobs from ${sourcesConnected} sources` : 'Real developer jobs from legitimate sources worldwide.'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowSources((v) => !v)}>
                        {showSources ? 'Hide' : 'Sources'}
                    </Button>
                    <Button size="sm" isLoading={ingesting} onClick={handleIngest} variant="secondary">
                        {ingesting ? 'Searching…' : '🔍 Search for new jobs'}
                    </Button>
                </div>
            </div>

            {ingestMsg && <AlertBanner type={ingestMsg.includes('failed') || ingestMsg.includes('wait') ? 'error' : 'success'} message={ingestMsg} />}
            {error && <AlertBanner type="error" message={error} />}

            {/* Source panel */}
            {showSources && health && <SourcePanel health={health.health} sources={health.sources} />}

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[{ label: 'Total', value: stats.total }, { label: 'Active', value: stats.active }, { label: 'Remote', value: stats.remote }, { label: 'Today', value: stats.today }].map((s) => (
                        <div key={s.label} className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 text-center">
                            <p className="text-xl font-bold text-gray-100 font-mono">{s.value.toLocaleString()}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="space-y-2">
                <input
                    type="text" placeholder="Search jobs, companies, skills…"
                    value={keyword} onChange={(e) => handleKeyword(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3.5 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <div className="flex flex-wrap gap-2">
                    {/* Remote filter */}
                    {[{ label: 'All', v: undefined }, { label: '🌍 Remote', v: true }, { label: '🏢 On-site', v: false }].map((opt) => (
                        <button key={opt.label}
                            onClick={() => { setRemote(opt.v); go({ remote: opt.v }); }}
                            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${remote === opt.v ? 'bg-brand-600 border-brand-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                            {opt.label}
                        </button>
                    ))}

                    {/* New Today */}
                    <button onClick={() => { const n = !newToday; setNewToday(n); go({ newToday: n }); }}
                        className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${newToday ? 'bg-yellow-600 border-yellow-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                        🔥 New Today
                    </button>

                    {/* Active Now */}
                    <button onClick={() => { const n = !activeNow; setActiveNow(n); go({ activeNow: n }); }}
                        className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${activeNow ? 'bg-green-700 border-green-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                        ✅ Active Now
                    </button>

                    {/* Country filter */}
                    {countries.length > 0 && (
                        <select value={country} onChange={(e) => { setCountry(e.target.value); go({ country: e.target.value || undefined }); }}
                            className="px-3 py-1.5 rounded-lg text-xs border border-gray-700 bg-gray-900 text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                            <option value="">All countries</option>
                            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    )}

                    {/* Source filter */}
                    {health && (
                        <select value={source} onChange={(e) => { setSource(e.target.value); go({ source: e.target.value || undefined }); }}
                            className="px-3 py-1.5 rounded-lg text-xs border border-gray-700 bg-gray-900 text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                            <option value="">All sources</option>
                            {health.sources.filter((s) => s.status === 'WORKING').map((s) => (
                                <option key={s.sourceName} value={s.sourceName}>{sourceLabel(s.sourceName)}</option>
                            ))}
                        </select>
                    )}

                    {/* Posted within */}
                    <select value={postedWithin ?? ''}
                        onChange={(e) => {
                            const v = e.target.value ? parseInt(e.target.value) : undefined;
                            setPostedWithin(v);
                            go({ postedWithin: v });
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs border border-gray-700 bg-gray-900 text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                        <option value="">Any time</option>
                        <option value="1">Last 24 hours</option>
                        <option value="3">Last 3 days</option>
                        <option value="7">Last 7 days</option>
                        <option value="14">Last 14 days</option>
                        <option value="30">Last 30 days</option>
                    </select>

                    {/* Sort */}
                    <select value={sortBy}
                        onChange={(e) => { const v = e.target.value as typeof sortBy; setSortBy(v); go({ sortBy: v }); }}
                        className="px-3 py-1.5 rounded-lg text-xs border border-gray-700 bg-gray-900 text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 ml-auto">
                        <option value="relevance">Best match</option>
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                    </select>                </div>
            </div>

            {/* Results */}
            {loading ? (
                <div className="flex justify-center py-20"><Spinner size="lg" className="text-brand-500" /></div>
            ) : !data || data.jobs.length === 0 ? (
                <div className="text-center py-20 space-y-3">
                    <p className="text-4xl">🔍</p>
                    <p className="text-gray-400 font-medium">No jobs found yet.</p>
                    <p className="text-gray-600 text-sm">Click "Search for new jobs" to fetch the latest listings from all sources.</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {data.jobs.map((job) => <JobCard key={job.id} job={job} />)}
                    </div>
                    {data.pagination.totalPages > 1 && (
                        <div className="flex items-center justify-center gap-3 pt-2">
                            <Button variant="secondary" size="sm" disabled={!data.pagination.hasPrev}
                                onClick={() => { const p = page - 1; setPage(p); load({ page: p }); }}>
                                ← Prev
                            </Button>
                            <span className="text-sm text-gray-400">Page {data.pagination.page} / {data.pagination.totalPages}</span>
                            <Button variant="secondary" size="sm" disabled={!data.pagination.hasNext}
                                onClick={() => { const p = page + 1; setPage(p); load({ page: p }); }}>
                                Next →
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

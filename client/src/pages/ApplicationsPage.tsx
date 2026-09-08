import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { applicationService, AppSummary, AppStats, AppStatus } from '../services/application.service';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import AlertBanner from '../components/ui/AlertBanner';

const STATUS_COLORS: Record<AppStatus, string> = {
    SAVED: 'bg-gray-800 text-gray-400 border-gray-700',
    INTERESTED: 'bg-blue-900/40 text-blue-300 border-blue-700',
    PREPARING: 'bg-indigo-900/40 text-indigo-300 border-indigo-700',
    APPLIED: 'bg-brand-900/40 text-brand-300 border-brand-700',
    INTERVIEW: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
    ASSESSMENT: 'bg-orange-900/40 text-orange-300 border-orange-700',
    OFFER: 'bg-green-900/40 text-green-300 border-green-700',
    REJECTED: 'bg-red-900/40 text-red-300 border-red-700',
    WITHDRAWN: 'bg-gray-800 text-gray-500 border-gray-700',
    CLOSED: 'bg-gray-800 text-gray-600 border-gray-700',
};

const ALL_STATUSES: AppStatus[] = ['SAVED', 'INTERESTED', 'PREPARING', 'APPLIED', 'INTERVIEW', 'ASSESSMENT', 'OFFER', 'REJECTED', 'WITHDRAWN', 'CLOSED'];

function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function AppCard({ app, onStatusChange, onDelete }: {
    app: AppSummary;
    onStatusChange: (id: string, status: AppStatus) => void;
    onDelete: (id: string) => void;
}) {
    const [updating, setUpdating] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [notes, setNotes] = useState(app.notes ?? '');
    const [savingNotes, setSavingNotes] = useState(false);

    async function changeStatus(status: AppStatus) {
        setUpdating(true);
        try { onStatusChange(app.id, status); } finally { setUpdating(false); }
    }

    async function saveNotes() {
        setSavingNotes(true);
        try {
            await applicationService.updateApplication(app.id, { notes });
        } finally { setSavingNotes(false); }
    }

    return (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-100 truncate">{app.jobTitle}</h3>
                    <p className="text-sm text-gray-400 truncate">{app.companyName}</p>
                    {app.location && <p className="text-xs text-gray-600 mt-0.5">{app.location}</p>}
                </div>
                <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[app.status]}`}>{app.status}</span>
            </div>

            <div className="flex flex-wrap gap-1.5 text-[11px] text-gray-500">
                <span className="capitalize">📡 {app.source}</span>
                {app.appliedAt && <span>Applied: {formatDate(app.appliedAt)}</span>}
                {app.interviewDate && <span className="text-yellow-400">Interview: {formatDate(app.interviewDate)}</span>}
                {app.followUpDate && <span>Follow-up: {formatDate(app.followUpDate)}</span>}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <select value={app.status} disabled={updating}
                    onChange={(e) => changeStatus(e.target.value as AppStatus)}
                    className="flex-1 min-w-0 px-2 py-1.5 rounded-lg text-xs border border-gray-700 bg-gray-800 text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <a href={app.originalUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="text-xs">View</Button>
                </a>
                {app.applicationUrl && (
                    <a href={app.applicationUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" className="text-xs">Apply</Button>
                    </a>
                )}
                <button onClick={() => setExpanded((v) => !v)} className="text-xs text-gray-500 hover:text-gray-300 px-1">
                    {expanded ? '▲' : '▼'}
                </button>
                <button onClick={() => onDelete(app.id)} className="text-xs text-red-600 hover:text-red-400 px-1">✕</button>
            </div>

            {expanded && (
                <div className="space-y-2 pt-1 border-t border-gray-800">
                    <textarea rows={3} placeholder="Notes…" value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full text-xs rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-gray-300 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
                    <Button size="sm" variant="secondary" isLoading={savingNotes} onClick={saveNotes}>Save notes</Button>
                    {app.cv && <p className="text-xs text-gray-500">CV: {app.cv.name}</p>}
                    {app.coverLetter && <p className="text-xs text-gray-500">Cover letter: {app.coverLetter.name}</p>}
                </div>
            )}
        </div>
    );
}

export default function ApplicationsPage() {
    const [apps, setApps] = useState<AppSummary[]>([]);
    const [stats, setStats] = useState<AppStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [keyword, setKeyword] = useState('');
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    async function load(pg = 1) {
        setLoading(true); setError('');
        try {
            const res = await applicationService.getApplications({ status: filterStatus || undefined, keyword: keyword || undefined, page: pg, limit: 20 });
            setApps(res.applications);
            setTotal(res.pagination.total);
            setTotalPages(res.pagination.totalPages);
            setPage(pg);
        } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load.'); }
        finally { setLoading(false); }
    }

    useEffect(() => {
        load(1);
        applicationService.getStats().then(setStats).catch(() => { });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleStatusChange(id: string, status: AppStatus) {
        await applicationService.updateApplication(id, { status });
        setApps((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
        applicationService.getStats().then(setStats).catch(() => { });
    }

    async function handleDelete(id: string) {
        await applicationService.deleteApplication(id);
        setApps((prev) => prev.filter((a) => a.id !== id));
        setTotal((t) => t - 1);
        applicationService.getStats().then(setStats).catch(() => { });
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-100">Applications</h1>
                    <p className="text-gray-500 text-sm mt-0.5">{total.toLocaleString()} total applications tracked.</p>
                </div>
                <div className="flex gap-2">
                    <Link to="/applications/profile"><Button variant="secondary" size="sm">My Profile</Button></Link>
                    <Link to="/applications/resumes"><Button variant="secondary" size="sm">CVs</Button></Link>
                </div>
            </div>

            {error && <AlertBanner type="error" message={error} />}

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                    {[
                        { label: 'Total', value: stats.total },
                        { label: 'This week', value: stats.thisWeek },
                        { label: 'Interviews', value: stats.interviews },
                        { label: 'Offers', value: stats.offers },
                        { label: 'Pending', value: stats.pending },
                        { label: 'Rejected', value: stats.rejections },
                        { label: 'This month', value: stats.thisMonth },
                    ].map((s) => (
                        <div key={s.label} className="rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-center">
                            <p className="text-lg font-bold text-gray-100 font-mono">{s.value}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{s.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <input placeholder="Search…" value={keyword} onChange={(e) => { setKeyword(e.target.value); load(1); }}
                    className="flex-1 min-w-40 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); load(1); }}
                    className="px-3 py-2 rounded-lg text-sm border border-gray-700 bg-gray-900 text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">All statuses</option>
                    {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><Spinner size="lg" className="text-brand-500" /></div>
            ) : apps.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                    <p className="text-3xl">📋</p>
                    <p className="text-gray-400 font-medium">No applications yet.</p>
                    <p className="text-gray-600 text-sm">Save or apply to jobs from the <Link to="/jobs" className="text-brand-400 hover:text-brand-300">Jobs</Link> page.</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {apps.map((app) => (
                            <AppCard key={app.id} app={app} onStatusChange={handleStatusChange} onDelete={handleDelete} />
                        ))}
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-3 pt-2">
                            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}>← Prev</Button>
                            <span className="text-sm text-gray-400">Page {page} / {totalPages}</span>
                            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => load(page + 1)}>Next →</Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

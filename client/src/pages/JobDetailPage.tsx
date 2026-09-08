import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getJobById } from '../services/job.service';
import { JobDetail, REMOTE_TYPE_LABELS, SALARY_PERIOD_LABELS } from '../types';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import AlertBanner from '../components/ui/AlertBanner';
import api from '../services/api';

function formatDate(d: string | null) {
    if (!d) return 'Unknown';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function salaryStr(job: JobDetail) {
    if (!job.salaryMin && !job.salaryMax) return job.salaryRaw ?? null;
    const c = job.salaryCurrency ?? '';
    const p = job.salaryPeriod ? ` ${SALARY_PERIOD_LABELS[job.salaryPeriod]}` : '';
    if (job.salaryMin && job.salaryMax) return `${c} ${job.salaryMin.toLocaleString()} – ${job.salaryMax.toLocaleString()}${p}`;
    if (job.salaryMin) return `${c} ${job.salaryMin.toLocaleString()}+${p}`;
    return null;
}

export default function JobDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [job, setJob] = useState<JobDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');
    const [saveError, setSaveError] = useState('');
    const [existingAppId, setExistingAppId] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        getJobById(id)
            .then((j) => {
                setJob(j);
                api.get(`/applications/for-job/${j.id}`)
                    .then((res: { data: { data: { id: string } | null } }) => {
                        if (res.data?.data?.id) setExistingAppId(res.data.data.id);
                    })
                    .catch(() => { });
            })
            .catch((e: Error) => setError(e.message || 'Failed to load job.'))
            .finally(() => setLoading(false));
    }, [id]);

    async function handleSave(status: 'SAVED' | 'APPLIED') {
        if (!job) return;
        if (existingAppId) { navigate('/applications'); return; }
        setSaving(true); setSaveMsg(''); setSaveError('');
        try {
            const res = await api.post('/applications', { jobId: job.id, status });
            setSaveMsg(status === 'SAVED' ? '✓ Saved to your tracker.' : '✓ Marked as Applied.');
            setExistingAppId((res.data?.data as { id: string })?.id ?? '__saved__');
        } catch (e: unknown) {
            setSaveError(e instanceof Error ? e.message : 'Could not save.');
        } finally { setSaving(false); }
    }

    if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" className="text-brand-500" /></div>;
    if (error) return <div className="max-w-3xl mx-auto py-12"><AlertBanner type="error" message={error} /></div>;
    if (!job) return null;

    const salary = salaryStr(job);
    const isActive = job.status === 'ACTIVE';

    return (
        <div className="max-w-3xl space-y-6">
            <Link to="/jobs" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">← Back to jobs</Link>

            {saveMsg && <AlertBanner type="success" message={saveMsg} />}
            {saveError && <AlertBanner type="error" message={saveError} />}

            {/* Header */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-100">{job.title}</h1>
                        <p className="text-brand-400 font-medium mt-1">{job.companyName}</p>
                    </div>
                    {job.remoteType !== 'UNKNOWN' && (
                        <span className={`self-start text-xs px-3 py-1.5 rounded-full border font-medium ${job.remoteType === 'REMOTE' ? 'bg-green-900/40 text-green-300 border-green-700' :
                                job.remoteType === 'HYBRID' ? 'bg-yellow-900/40 text-yellow-300 border-yellow-700' :
                                    'bg-gray-800 text-gray-400 border-gray-700'}`}>
                            {REMOTE_TYPE_LABELS[job.remoteType]}
                        </span>
                    )}
                </div>

                {/* Status badges */}
                <div className="flex items-center gap-2 flex-wrap">
                    {isActive
                        ? job.verificationStatus === 'ACTIVE'
                            ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 text-green-300 border border-green-700">ACTIVE — Verified</span>
                            : <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">Status: Unable to verify</span>
                        : <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-300 border border-red-700">CLOSED / EXPIRED</span>
                    }
                    {existingAppId && <span className="text-xs px-2 py-0.5 rounded-full bg-brand-900/40 text-brand-300 border border-brand-700">In your tracker</span>}
                </div>

                {/* Job metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    {job.location && <div><p className="text-xs text-gray-600 mb-0.5">Location</p><p className="text-gray-300">{job.location}</p></div>}
                    {job.country && <div><p className="text-xs text-gray-600 mb-0.5">Country</p><p className="text-gray-300">{job.country}</p></div>}
                    {job.employmentType && <div><p className="text-xs text-gray-600 mb-0.5">Type</p><p className="text-gray-300">{job.employmentType}</p></div>}
                    {salary && <div><p className="text-xs text-gray-600 mb-0.5">Salary</p><p className="text-green-400 font-medium">{salary}</p></div>}
                    <div><p className="text-xs text-gray-600 mb-0.5">Posted</p><p className="text-gray-300">{formatDate(job.postedAt)}</p></div>
                    <div><p className="text-xs text-gray-600 mb-0.5">Source</p><p className="text-gray-300 capitalize">{job.source}</p></div>
                </div>

                {/* Tags */}
                {job.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {job.tags.map((t) => <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-400">{t}</span>)}
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 pt-2">
                    {job.applicationUrl && isActive && (
                        <a href={job.applicationUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="md">Apply Now →</Button>
                        </a>
                    )}
                    <a href={job.originalUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="secondary" size="md">View Original Listing</Button>
                    </a>
                    {existingAppId
                        ? <Button variant="ghost" size="md" onClick={() => navigate('/applications')}>View in Tracker</Button>
                        : <>
                            <Button variant="ghost" size="md" isLoading={saving} onClick={() => handleSave('SAVED')}>💾 Save</Button>
                            {job.applicationUrl && <Button variant="ghost" size="md" isLoading={saving} onClick={() => handleSave('APPLIED')}>✓ Mark Applied</Button>}
                        </>
                    }
                </div>

                {!isActive && (
                    <p className="text-xs text-yellow-500">⚠️ This listing may no longer be accepting applications. Check the original source before applying.</p>
                )}
            </div>

            {/* Description */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Job Description</h2>
                <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">{job.description}</div>
            </div>

            {/* Source info */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-3">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Source Information</h2>
                <div className="space-y-2 text-sm">
                    <div><p className="text-xs text-gray-600 mb-0.5">Source</p><p className="text-gray-300 capitalize">{job.source}</p></div>
                    <div>
                        <p className="text-xs text-gray-600 mb-0.5">Original listing</p>
                        <a href={job.originalUrl} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 break-all underline text-xs">{job.originalUrl}</a>
                    </div>
                    {job.applicationUrl && job.applicationUrl !== job.originalUrl && (
                        <div>
                            <p className="text-xs text-gray-600 mb-0.5">Application URL</p>
                            <a href={job.applicationUrl} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 break-all underline text-xs">{job.applicationUrl}</a>
                        </div>
                    )}
                    {!job.applicationUrl && (
                        <p className="text-xs text-yellow-600">⚠️ You will need to complete this application on the original website.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

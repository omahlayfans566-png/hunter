import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { applicationService, ResumeMeta } from '../services/application.service';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import AlertBanner from '../components/ui/AlertBanner';

export default function ResumesPage() {
    const [resumes, setResumes] = useState<ResumeMeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');
    const [name, setName] = useState('');
    const [makeCurrent, setMakeCurrent] = useState(true);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        applicationService.listResumes().then(setResumes).catch(() => setError("Couldn't load resumes.")).finally(() => setLoading(false));
    }, []);

    async function handleUpload(e: React.FormEvent) {
        e.preventDefault();
        const file = fileRef.current?.files?.[0];
        if (!file) { setError('Please select a file.'); return; }
        if (!name.trim()) { setError('Please enter a name for this CV.'); return; }
        if (file.size > 5 * 1024 * 1024) { setError('File must be smaller than 5 MB.'); return; }
        setUploading(true); setError(''); setMsg('');
        try {
            const updated = await applicationService.uploadResume(name.trim(), file, makeCurrent);
            setResumes(updated as ResumeMeta[]);
            setMsg('CV uploaded successfully.');
            setName('');
            if (fileRef.current) fileRef.current.value = '';
        } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed.'); }
        finally { setUploading(false); }
    }

    async function setCurrent(id: string) {
        setError('');
        try {
            const updated = await applicationService.updateResume(id, { isCurrent: true });
            setResumes(updated as ResumeMeta[]);
        } catch (e) { setError(e instanceof Error ? e.message : 'Failed.'); }
    }

    async function deleteResume(id: string) {
        setError('');
        try {
            const updated = await applicationService.deleteResume(id);
            setResumes(updated as ResumeMeta[]);
        } catch (e) { setError(e instanceof Error ? e.message : 'Failed.'); }
    }

    function formatSize(bytes: number) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return (
        <div className="max-w-2xl space-y-6">
            <div className="flex items-center gap-4">
                <Link to="/applications" className="text-sm text-gray-500 hover:text-gray-300">← Applications</Link>
                <h1 className="text-2xl font-bold text-gray-100">My CVs / Resumes</h1>
            </div>

            {msg && <AlertBanner type="success" message={msg} />}
            {error && <AlertBanner type="error" message={error} />}

            {/* Upload form */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
                <h2 className="text-sm font-semibold text-gray-300">Upload CV</h2>
                <form onSubmit={handleUpload} className="space-y-3">
                    <input type="text" placeholder="CV name (e.g. Full-Stack Developer CV)" value={name} onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                    <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt"
                        className="w-full text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-gray-800 file:text-gray-300 hover:file:bg-gray-700" />
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={makeCurrent} onChange={(e) => setMakeCurrent(e.target.checked)} className="rounded border-gray-600" />
                        <span className="text-sm text-gray-400">Set as current CV</span>
                    </label>
                    <Button type="submit" size="sm" isLoading={uploading}>{uploading ? 'Uploading…' : 'Upload CV'}</Button>
                </form>
            </div>

            {/* CV list */}
            {loading ? (
                <div className="flex justify-center py-10"><Spinner size="md" className="text-brand-500" /></div>
            ) : resumes.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No CVs uploaded yet.</p>
            ) : (
                <div className="space-y-3">
                    {resumes.map((r) => (
                        <div key={r.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-gray-200 truncate">{r.name}</p>
                                    {r.isCurrent && <span className="text-xs px-2 py-0.5 rounded-full bg-brand-900/40 text-brand-300 border border-brand-700 shrink-0">Current</span>}
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">{r.fileName} · {formatSize(r.fileSize)}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <a href={applicationService.getResumeDownloadUrl(r.id)} download={r.fileName} target="_blank" rel="noopener noreferrer">
                                    <Button variant="ghost" size="sm" className="text-xs">Download</Button>
                                </a>
                                {!r.isCurrent && <Button variant="secondary" size="sm" className="text-xs" onClick={() => setCurrent(r.id)}>Set current</Button>}
                                <button onClick={() => deleteResume(r.id)} className="text-xs text-red-600 hover:text-red-400 px-1">✕</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

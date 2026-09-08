import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { applicationService } from '../services/application.service';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import AlertBanner from '../components/ui/AlertBanner';
import Spinner from '../components/ui/Spinner';

export default function ApplicationProfilePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');

    // fields
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [location, setLocation] = useState('');
    const [title, setTitle] = useState('');
    const [summary, setSummary] = useState('');
    const [portfolioUrl, setPortfolioUrl] = useState('');
    const [githubUrl, setGithubUrl] = useState('');
    const [linkedinUrl, setLinkedinUrl] = useState('');
    const [education, setEducation] = useState('');

    useEffect(() => {
        applicationService.getApplicationProfile()
            .then((data) => {
                const u = data.user;
                const ap = data.applicationProfile;
                const dp = data.developerProfile;
                setFullName(`${u.firstName ?? ''} ${u.lastName ?? ''}`.trim());
                setEmail(u.email ?? '');
                setPhone(ap?.phone ?? '');
                setLocation(dp?.location ?? '');
                setTitle(dp?.professionalTitle ?? '');
                setSummary(dp?.bio ?? '');
                setPortfolioUrl(dp?.portfolioUrl ?? '');
                setGithubUrl(ap?.githubUrl ?? '');
                setLinkedinUrl(ap?.linkedinUrl ?? '');
                setEducation(ap?.education ?? '');
            })
            .catch(() => setError("Couldn't load profile."))
            .finally(() => setLoading(false));
    }, []);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true); setError(''); setMsg('');
        try {
            await applicationService.saveApplicationProfile({
                fullName: fullName.trim() || undefined,
                email: email.trim() || undefined,
                phone: phone || null,
                location: location || null,
                professionalTitle: title || null,
                professionalSummary: summary || null,
                portfolioUrl: portfolioUrl || null,
                githubUrl: githubUrl || null,
                linkedinUrl: linkedinUrl || null,
                education: education || null,
            });
            setMsg('Profile saved successfully.');
        } catch (e) { setError(e instanceof Error ? e.message : 'Save failed.'); }
        finally { setSaving(false); }
    }

    if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" className="text-brand-500" /></div>;

    return (
        <div className="max-w-2xl space-y-6">
            <div className="flex items-center gap-4">
                <Link to="/applications" className="text-sm text-gray-500 hover:text-gray-300">← Applications</Link>
                <h1 className="text-2xl font-bold text-gray-100">Application Profile</h1>
            </div>
            <p className="text-gray-500 text-sm">This information is used when preparing job applications.</p>

            {msg && <AlertBanner type="success" message={msg} />}
            {error && <AlertBanner type="error" message={error} />}

            <form onSubmit={handleSave} className="space-y-5" noValidate>
                <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Identity</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={saving} />
                        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={saving} />
                        <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={saving} />
                        <Input label="Location" placeholder="e.g. Lagos, Nigeria" value={location} onChange={(e) => setLocation(e.target.value)} disabled={saving} />
                    </div>
                </div>

                <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Professional</h2>
                    <Input label="Professional title" placeholder="e.g. Full Stack Developer" value={title} onChange={(e) => setTitle(e.target.value)} disabled={saving} />
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-300">Professional summary <span className="text-gray-600 font-normal">({summary.length}/1000)</span></label>
                        <textarea rows={4} maxLength={1000} value={summary} onChange={(e) => setSummary(e.target.value)} disabled={saving}
                            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3.5 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none hover:border-gray-600" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-300">Education & certifications</label>
                        <textarea rows={3} value={education} onChange={(e) => setEducation(e.target.value)} disabled={saving} placeholder="e.g. BSc Computer Science, University of Lagos, 2020..."
                            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3.5 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none hover:border-gray-600" />
                    </div>
                </div>

                <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-4">
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Links</h2>
                    <Input label="Portfolio URL" type="url" placeholder="https://yourportfolio.com" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} disabled={saving} />
                    <Input label="GitHub URL" type="url" placeholder="https://github.com/yourname" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} disabled={saving} />
                    <Input label="LinkedIn URL" type="url" placeholder="https://linkedin.com/in/yourname" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} disabled={saving} />
                </div>

                <div className="flex gap-3">
                    <Button type="submit" size="md" isLoading={saving}>{saving ? 'Saving…' : 'Save profile'}</Button>
                    <Link to="/applications/resumes"><Button type="button" variant="secondary" size="md">Manage CVs</Button></Link>
                </div>
            </form>
        </div>
    );
}

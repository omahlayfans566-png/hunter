import { useState, useEffect, useCallback } from 'react';
import {
    getFullProfile,
    saveDeveloperProfile,
    updateUserNames,
    createSkill,
    updateSkill,
    deleteSkill,
} from '../services/profile.service';
import {
    User, DeveloperProfile, DeveloperProfileInput, Skill,
    ExperienceLevel, Specialization, JobType, WorkPreference,
    SalaryPeriod, Availability, SkillProficiency, SkillCategory,
    EXPERIENCE_LEVELS, EXPERIENCE_LEVEL_LABELS,
    SPECIALIZATIONS, SPECIALIZATION_LABELS,
    JOB_TYPES, JOB_TYPE_LABELS,
    WORK_PREFERENCES, WORK_PREFERENCE_LABELS,
    SALARY_PERIODS, SALARY_PERIOD_LABELS,
    AVAILABILITIES, AVAILABILITY_LABELS,
    SKILL_PROFICIENCIES, SKILL_PROFICIENCY_LABELS,
    SKILL_CATEGORIES, SKILL_CATEGORY_LABELS,
    CURRENCIES,
} from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import AlertBanner from '../components/ui/AlertBanner';
import Spinner from '../components/ui/Spinner';
import Select from '../components/ui/Select';
import ToggleChip from '../components/ui/ToggleChip';
import CompletionBar from '../components/ui/CompletionBar';

// ── Helpers ───────────────────────────────────────────────────────────────

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function toggle<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

const EMPTY_DEV: DeveloperProfileInput = {
    professionalTitle: '', bio: '',
    yearsOfExperience: null, experienceLevel: null,
    primarySpecialization: null, secondarySpecializations: [],
    location: '', country: '', timezone: '',
    remoteWorldwide: false, preferredCountries: [], preferredCities: [],
    jobTypes: [], workPreferences: [],
    salaryMin: null, salaryMax: null, currency: null, salaryPeriod: null,
    availability: null, portfolioUrl: '',
};

function profileToForm(p: DeveloperProfile): DeveloperProfileInput {
    return {
        professionalTitle: p.professionalTitle ?? '',
        bio: p.bio ?? '',
        yearsOfExperience: p.yearsOfExperience ?? null,
        experienceLevel: p.experienceLevel ?? null,
        primarySpecialization: p.primarySpecialization ?? null,
        secondarySpecializations: p.secondarySpecializations ?? [],
        location: p.location ?? '',
        country: p.country ?? '',
        timezone: p.timezone ?? '',
        remoteWorldwide: p.remoteWorldwide ?? false,
        preferredCountries: p.preferredCountries ?? [],
        preferredCities: p.preferredCities ?? [],
        jobTypes: p.jobTypes ?? [],
        workPreferences: p.workPreferences ?? [],
        salaryMin: p.salaryMin ?? null,
        salaryMax: p.salaryMax ?? null,
        currency: p.currency ?? null,
        salaryPeriod: p.salaryPeriod ?? null,
        availability: p.availability ?? null,
        portfolioUrl: p.portfolioUrl ?? '',
    };
}

// ── Section wrapper ───────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800 bg-gray-900/80">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{title}</h2>
            </div>
            <div className="px-5 py-5 space-y-4">{children}</div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2 border-b border-gray-800 last:border-0">
            <span className="text-xs text-gray-500 sm:w-40 shrink-0 pt-0.5">{label}</span>
            <span className="text-sm text-gray-200">{value || <span className="text-gray-600 italic">Not set</span>}</span>
        </div>
    );
}

function ChipList({ items }: { items: string[] }) {
    if (!items.length) return <span className="text-gray-600 italic text-sm">Not set</span>;
    return (
        <div className="flex flex-wrap gap-1.5">
            {items.map((i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-xs text-gray-300">{i}</span>
            ))}
        </div>
    );
}

// ── Skill row component ───────────────────────────────────────────────────
function SkillRow({
    skill, onDelete, onEdit, disabled,
}: { skill: Skill; onDelete: () => void; onEdit: () => void; disabled: boolean }) {
    return (
        <div className="flex items-center justify-between gap-3 py-2 border-b border-gray-800 last:border-0">
            <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-gray-200 truncate">{skill.name}</span>
                {skill.category && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-400">
                        {SKILL_CATEGORY_LABELS[skill.category]}
                    </span>
                )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${skill.proficiency === 'EXPERT' ? 'bg-brand-900/50 border-brand-700 text-brand-300' :
                    skill.proficiency === 'ADVANCED' ? 'bg-green-900/30 border-green-700 text-green-300' :
                        skill.proficiency === 'INTERMEDIATE' ? 'bg-yellow-900/30 border-yellow-700 text-yellow-300' :
                            'bg-gray-800 border-gray-700 text-gray-400'
                    }`}>
                    {SKILL_PROFICIENCY_LABELS[skill.proficiency]}
                </span>
                <button onClick={onEdit} disabled={disabled}
                    className="text-xs text-gray-500 hover:text-gray-200 disabled:opacity-40 transition-colors px-1">
                    Edit
                </button>
                <button onClick={onDelete} disabled={disabled}
                    className="text-xs text-red-600 hover:text-red-400 disabled:opacity-40 transition-colors px-1">
                    Remove
                </button>
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────
export default function ProfilePage() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<DeveloperProfile | null>(null);
    const [completion, setCompletion] = useState(0);
    const [skills, setSkills] = useState<Skill[]>([]);

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    // which panel is open for editing
    const [editingPanel, setEditingPanel] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState('');

    // form state for developer profile
    const [devForm, setDevForm] = useState<DeveloperProfileInput>(EMPTY_DEV);
    const [, setDevErrors] = useState<Partial<Record<string, string>>>({});

    // name editing (Phase 1 compat)
    const [nameForm, setNameForm] = useState({ firstName: '', lastName: '' });
    const [nameErrors, setNameErrors] = useState<{ firstName?: string; lastName?: string }>({});

    // skill form
    const [skillForm, setSkillForm] = useState({ name: '', proficiency: '' as SkillProficiency | '', category: '' as SkillCategory | '' });
    const [skillErrors, setSkillErrors] = useState<{ name?: string; proficiency?: string }>({});
    const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
    const [skillSaving, setSkillSaving] = useState(false);
    const [skillError, setSkillError] = useState('');

    const load = useCallback(() => {
        setLoading(true);
        getFullProfile()
            .then(({ user: u, profile: p }) => {
                setUser(u);
                setNameForm({ firstName: u.firstName, lastName: u.lastName });
                if (p) {
                    setProfile(p);
                    setSkills(p.skills);
                    setCompletion(p.completion);
                    setDevForm(profileToForm(p));
                }
            })
            .catch(() => setLoadError("We couldn't load your profile. Please try again."))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

    function openPanel(panel: string) {
        setSaveError(''); setSaveSuccess(''); setDevErrors({});
        setEditingPanel(panel);
    }
    function closePanel() { setEditingPanel(null); setSaveError(''); setDevErrors({}); }

    async function saveDevSection(section: string) {
        setSaving(true); setSaveError('');
        try {
            const updated = await saveDeveloperProfile(devForm);
            setProfile(updated);
            setSkills(updated.skills);
            setCompletion(updated.completion);
            setDevForm(profileToForm(updated));
            setSaveSuccess('Saved successfully.');
            setEditingPanel(null);
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Save failed. Please try again.');
        } finally {
            setSaving(false);
        }
        void section;
    }

    async function saveNames(e: React.FormEvent) {
        e.preventDefault();
        const errs: typeof nameErrors = {};
        if (!nameForm.firstName.trim()) errs.firstName = 'First name is required.';
        if (!nameForm.lastName.trim()) errs.lastName = 'Last name is required.';
        if (Object.keys(errs).length) { setNameErrors(errs); return; }
        setSaving(true); setSaveError('');
        try {
            const updated = await updateUserNames(nameForm);
            setUser(updated);
            setSaveSuccess('Name updated.');
            setEditingPanel(null);
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Save failed.');
        } finally { setSaving(false); }
    }

    function validateSkillForm() {
        const errs: typeof skillErrors = {};
        if (!skillForm.name.trim()) errs.name = 'Skill name is required.';
        if (!skillForm.proficiency) errs.proficiency = 'Proficiency is required.';
        setSkillErrors(errs);
        return Object.keys(errs).length === 0;
    }

    async function handleSkillSave(e: React.FormEvent) {
        e.preventDefault();
        if (!validateSkillForm()) return;
        setSkillSaving(true); setSkillError('');
        try {
            const payload = {
                name: skillForm.name.trim(),
                proficiency: skillForm.proficiency as string,
                category: skillForm.category || null,
            };
            const res = editingSkillId
                ? await updateSkill(editingSkillId, payload)
                : await createSkill(payload);
            setSkills(res.skills);
            setCompletion(res.completion);
            setSkillForm({ name: '', proficiency: '', category: '' });
            setEditingSkillId(null);
        } catch (err) {
            setSkillError(err instanceof Error ? err.message : 'Could not save skill.');
        } finally { setSkillSaving(false); }
    }

    function startEditSkill(skill: Skill) {
        setSkillForm({ name: skill.name, proficiency: skill.proficiency, category: skill.category ?? '' });
        setEditingSkillId(skill.id);
        setSkillError('');
        setSkillErrors({});
    }

    async function handleSkillDelete(id: string) {
        setSkillSaving(true); setSkillError('');
        try {
            const res = await deleteSkill(id);
            setSkills(res.skills);
            setCompletion(res.completion);
        } catch (err) {
            setSkillError(err instanceof Error ? err.message : 'Could not remove skill.');
        } finally { setSkillSaving(false); }
    }

    if (loading) return (
        <div className="flex items-center justify-center py-24">
            <Spinner size="lg" className="text-brand-500" />
        </div>
    );

    if (loadError) return (
        <div className="max-w-2xl mx-auto py-12">
            <AlertBanner type="error" message={loadError} />
        </div>
    );

    if (!user) return null;

    return (
        <div className="max-w-3xl space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-100">Developer Profile</h1>
                    <p className="text-gray-500 text-sm mt-1">Your professional profile for job matching.</p>
                </div>
            </div>

            {saveSuccess && !editingPanel && (
                <AlertBanner type="success" message={saveSuccess} />
            )}

            {/* Completion bar */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 px-5 py-4">
                <CompletionBar percent={completion} />
            </div>

            {/* ── PERSONAL INFORMATION ─────────────────────────────────────── */}
            <Section title="Personal Information">
                {editingPanel === 'names' ? (
                    <form onSubmit={saveNames} className="space-y-4" noValidate>
                        {saveError && <AlertBanner type="error" message={saveError} />}
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="First name" value={nameForm.firstName} onChange={e => { setNameForm(p => ({ ...p, firstName: e.target.value })); setNameErrors(p => ({ ...p, firstName: undefined })); }} error={nameErrors.firstName} disabled={saving} />
                            <Input label="Last name" value={nameForm.lastName} onChange={e => { setNameForm(p => ({ ...p, lastName: e.target.value })); setNameErrors(p => ({ ...p, lastName: undefined })); }} error={nameErrors.lastName} disabled={saving} />
                        </div>
                        <div className="rounded-lg bg-gray-800/50 px-3.5 py-2.5 border border-gray-700">
                            <p className="text-xs text-gray-500 mb-1">Email address</p>
                            <p className="text-sm text-gray-400">{user.email}</p>
                        </div>
                        <div className="flex gap-3">
                            <Button type="submit" size="sm" isLoading={saving}>{saving ? 'Saving…' : 'Save'}</Button>
                            <Button type="button" variant="ghost" size="sm" onClick={closePanel} disabled={saving}>Cancel</Button>
                        </div>
                    </form>
                ) : (
                    <>
                        <Row label="First name" value={user.firstName} />
                        <Row label="Last name" value={user.lastName} />
                        <Row label="Email" value={user.email} />
                        <Row label="Member since" value={formatDate(user.createdAt)} />
                        <Button variant="secondary" size="sm" onClick={() => openPanel('names')}>Edit name</Button>
                    </>
                )}
            </Section>

            {/* ── PROFESSIONAL INFORMATION ──────────────────────────────────── */}
            <Section title="Professional Information">
                {editingPanel === 'professional' ? (
                    <div className="space-y-4">
                        {saveError && <AlertBanner type="error" message={saveError} />}
                        <Input label="Professional title" placeholder="e.g. Full Stack Developer" value={devForm.professionalTitle ?? ''} onChange={e => setDevForm(p => ({ ...p, professionalTitle: e.target.value }))} disabled={saving} />
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-gray-300">Bio <span className="text-gray-600 font-normal">({(devForm.bio ?? '').length}/1000)</span></label>
                            <textarea rows={4} maxLength={1000} value={devForm.bio ?? ''} onChange={e => setDevForm(p => ({ ...p, bio: e.target.value }))} disabled={saving}
                                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3.5 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none hover:border-gray-600" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Select label="Experience level" value={devForm.experienceLevel ?? ''} onChange={e => setDevForm(p => ({ ...p, experienceLevel: (e.target.value as ExperienceLevel) || null }))} options={EXPERIENCE_LEVELS.map(v => ({ value: v, label: EXPERIENCE_LEVEL_LABELS[v] }))} disabled={saving} />
                            <Input label="Years of experience" type="number" min={0} max={60} value={devForm.yearsOfExperience ?? ''} onChange={e => setDevForm(p => ({ ...p, yearsOfExperience: e.target.value ? parseInt(e.target.value) : null }))} disabled={saving} />
                        </div>
                        <Select label="Primary specialization" value={devForm.primarySpecialization ?? ''} onChange={e => setDevForm(p => ({ ...p, primarySpecialization: (e.target.value as Specialization) || null }))} options={SPECIALIZATIONS.map(v => ({ value: v, label: SPECIALIZATION_LABELS[v] }))} disabled={saving} />
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-300">Secondary specializations</p>
                            <div className="flex flex-wrap gap-2">
                                {SPECIALIZATIONS.filter(s => s !== devForm.primarySpecialization).map(s => (
                                    <ToggleChip key={s} label={SPECIALIZATION_LABELS[s]} selected={(devForm.secondarySpecializations ?? []).includes(s)} onToggle={() => setDevForm(p => ({ ...p, secondarySpecializations: toggle(p.secondarySpecializations ?? [], s) }))} disabled={saving} />
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button size="sm" isLoading={saving} onClick={() => saveDevSection('professional')}>{saving ? 'Saving…' : 'Save'}</Button>
                            <Button variant="ghost" size="sm" onClick={closePanel} disabled={saving}>Cancel</Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <Row label="Title" value={profile?.professionalTitle} />
                        <Row label="Bio" value={profile?.bio} />
                        <Row label="Experience level" value={profile?.experienceLevel ? EXPERIENCE_LEVEL_LABELS[profile.experienceLevel] : null} />
                        <Row label="Years of experience" value={profile?.yearsOfExperience != null ? `${profile.yearsOfExperience} years` : null} />
                        <Row label="Primary specialization" value={profile?.primarySpecialization ? SPECIALIZATION_LABELS[profile.primarySpecialization] : null} />
                        <Row label="Secondary specializations" value={<ChipList items={(profile?.secondarySpecializations ?? []).map(s => SPECIALIZATION_LABELS[s])} />} />
                        <Button variant="secondary" size="sm" onClick={() => openPanel('professional')}>Edit</Button>
                    </>
                )}
            </Section>

            {/* ── LOCATION ─────────────────────────────────────────────────── */}
            <Section title="Location">
                {editingPanel === 'location' ? (
                    <div className="space-y-4">
                        {saveError && <AlertBanner type="error" message={saveError} />}
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="City / Location" placeholder="e.g. Lagos" value={devForm.location ?? ''} onChange={e => setDevForm(p => ({ ...p, location: e.target.value }))} disabled={saving} />
                            <Input label="Country" placeholder="e.g. Nigeria" value={devForm.country ?? ''} onChange={e => setDevForm(p => ({ ...p, country: e.target.value }))} disabled={saving} />
                        </div>
                        <Input label="Timezone" placeholder="e.g. Africa/Lagos" value={devForm.timezone ?? ''} onChange={e => setDevForm(p => ({ ...p, timezone: e.target.value }))} disabled={saving} />
                        <div className="flex gap-3 pt-2">
                            <Button size="sm" isLoading={saving} onClick={() => saveDevSection('location')}>{saving ? 'Saving…' : 'Save'}</Button>
                            <Button variant="ghost" size="sm" onClick={closePanel} disabled={saving}>Cancel</Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <Row label="Location" value={profile?.location} />
                        <Row label="Country" value={profile?.country} />
                        <Row label="Timezone" value={profile?.timezone} />
                        <Button variant="secondary" size="sm" onClick={() => openPanel('location')}>Edit</Button>
                    </>
                )}
            </Section>

            {/* ── TECHNICAL SKILLS ─────────────────────────────────────────── */}
            <Section title="Technical Skills">
                {skillError && <AlertBanner type="error" message={skillError} />}
                {skills.length > 0 && (
                    <div className="mb-2">
                        {skills.map(skill => (
                            <SkillRow key={skill.id} skill={skill}
                                onEdit={() => startEditSkill(skill)}
                                onDelete={() => handleSkillDelete(skill.id)}
                                disabled={skillSaving} />
                        ))}
                    </div>
                )}
                {/* Add / Edit skill form */}
                <form onSubmit={handleSkillSave} className="space-y-3 pt-2 border-t border-gray-800" noValidate>
                    <p className="text-xs text-gray-500 font-medium pt-1">{editingSkillId ? 'Edit skill' : 'Add a skill'}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Input label="Skill name" placeholder="e.g. React" value={skillForm.name} onChange={e => { setSkillForm(p => ({ ...p, name: e.target.value })); setSkillErrors(p => ({ ...p, name: undefined })); }} error={skillErrors.name} disabled={skillSaving} />
                        <Select label="Proficiency" value={skillForm.proficiency} onChange={e => { setSkillForm(p => ({ ...p, proficiency: e.target.value as SkillProficiency })); setSkillErrors(p => ({ ...p, proficiency: undefined })); }} options={SKILL_PROFICIENCIES.map(v => ({ value: v, label: SKILL_PROFICIENCY_LABELS[v] }))} error={skillErrors.proficiency} disabled={skillSaving} />
                        <Select label="Category (optional)" value={skillForm.category} onChange={e => setSkillForm(p => ({ ...p, category: e.target.value as SkillCategory }))} options={SKILL_CATEGORIES.map(v => ({ value: v, label: SKILL_CATEGORY_LABELS[v] }))} disabled={skillSaving} />
                    </div>
                    <div className="flex gap-2">
                        <Button type="submit" size="sm" isLoading={skillSaving}>{editingSkillId ? 'Update skill' : 'Add skill'}</Button>
                        {editingSkillId && <Button type="button" variant="ghost" size="sm" onClick={() => { setEditingSkillId(null); setSkillForm({ name: '', proficiency: '', category: '' }); setSkillErrors({}); }} disabled={skillSaving}>Cancel</Button>}
                    </div>
                </form>
            </Section>

            {/* ── JOB PREFERENCES ──────────────────────────────────────────── */}
            <Section title="Job Preferences">
                {editingPanel === 'jobprefs' ? (
                    <div className="space-y-5">
                        {saveError && <AlertBanner type="error" message={saveError} />}
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-300">Job types</p>
                            <div className="flex flex-wrap gap-2">
                                {JOB_TYPES.map(t => <ToggleChip key={t} label={JOB_TYPE_LABELS[t]} selected={(devForm.jobTypes ?? []).includes(t)} onToggle={() => setDevForm(p => ({ ...p, jobTypes: toggle(p.jobTypes ?? [], t as JobType) }))} disabled={saving} />)}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-300">Work preferences</p>
                            <div className="flex flex-wrap gap-2">
                                {WORK_PREFERENCES.map(w => <ToggleChip key={w} label={WORK_PREFERENCE_LABELS[w]} selected={(devForm.workPreferences ?? []).includes(w)} onToggle={() => setDevForm(p => ({ ...p, workPreferences: toggle(p.workPreferences ?? [], w as WorkPreference) }))} disabled={saving} />)}
                            </div>
                        </div>
                        <Select label="Availability" value={devForm.availability ?? ''} onChange={e => setDevForm(p => ({ ...p, availability: (e.target.value as Availability) || null }))} options={AVAILABILITIES.map(v => ({ value: v, label: AVAILABILITY_LABELS[v] }))} disabled={saving} />
                        <div className="flex gap-3 pt-2">
                            <Button size="sm" isLoading={saving} onClick={() => saveDevSection('jobprefs')}>{saving ? 'Saving…' : 'Save'}</Button>
                            <Button variant="ghost" size="sm" onClick={closePanel} disabled={saving}>Cancel</Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <Row label="Job types" value={<ChipList items={(profile?.jobTypes ?? []).map(t => JOB_TYPE_LABELS[t])} />} />
                        <Row label="Work preferences" value={<ChipList items={(profile?.workPreferences ?? []).map(w => WORK_PREFERENCE_LABELS[w])} />} />
                        <Row label="Availability" value={profile?.availability ? AVAILABILITY_LABELS[profile.availability] : null} />
                        <Button variant="secondary" size="sm" onClick={() => openPanel('jobprefs')}>Edit</Button>
                    </>
                )}
            </Section>

            {/* ── LOCATION PREFERENCES ─────────────────────────────────────── */}
            <Section title="Location Preferences">
                {editingPanel === 'locprefs' ? (
                    <div className="space-y-4">
                        {saveError && <AlertBanner type="error" message={saveError} />}
                        <div className="flex items-center gap-3">
                            <input type="checkbox" id="remoteWorldwide" checked={devForm.remoteWorldwide ?? false} onChange={e => setDevForm(p => ({ ...p, remoteWorldwide: e.target.checked }))} disabled={saving} className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-brand-500 focus:ring-brand-500" />
                            <label htmlFor="remoteWorldwide" className="text-sm text-gray-300">Open to remote worldwide</label>
                        </div>
                        <Input label="Preferred countries (comma-separated)" placeholder="e.g. Nigeria, United Kingdom, Canada" value={(devForm.preferredCountries ?? []).join(', ')} onChange={e => setDevForm(p => ({ ...p, preferredCountries: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} disabled={saving} />
                        <Input label="Preferred cities (comma-separated)" placeholder="e.g. Lagos, London, Toronto" value={(devForm.preferredCities ?? []).join(', ')} onChange={e => setDevForm(p => ({ ...p, preferredCities: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} disabled={saving} />
                        <div className="flex gap-3 pt-2">
                            <Button size="sm" isLoading={saving} onClick={() => saveDevSection('locprefs')}>{saving ? 'Saving…' : 'Save'}</Button>
                            <Button variant="ghost" size="sm" onClick={closePanel} disabled={saving}>Cancel</Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <Row label="Remote worldwide" value={profile?.remoteWorldwide ? 'Yes' : 'No'} />
                        <Row label="Preferred countries" value={<ChipList items={profile?.preferredCountries ?? []} />} />
                        <Row label="Preferred cities" value={<ChipList items={profile?.preferredCities ?? []} />} />
                        <Button variant="secondary" size="sm" onClick={() => openPanel('locprefs')}>Edit</Button>
                    </>
                )}
            </Section>

            {/* ── SALARY ───────────────────────────────────────────────────── */}
            <Section title="Salary Expectations">
                {editingPanel === 'salary' ? (
                    <div className="space-y-4">
                        {saveError && <AlertBanner type="error" message={saveError} />}
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Minimum" type="number" min={0} placeholder="0" value={devForm.salaryMin ?? ''} onChange={e => setDevForm(p => ({ ...p, salaryMin: e.target.value ? parseInt(e.target.value) : null }))} disabled={saving} />
                            <Input label="Maximum" type="number" min={0} placeholder="0" value={devForm.salaryMax ?? ''} onChange={e => setDevForm(p => ({ ...p, salaryMax: e.target.value ? parseInt(e.target.value) : null }))} disabled={saving} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Select label="Currency" value={devForm.currency ?? ''} onChange={e => setDevForm(p => ({ ...p, currency: e.target.value || null }))} options={CURRENCIES.map(c => ({ value: c, label: c }))} disabled={saving} />
                            <Select label="Period" value={devForm.salaryPeriod ?? ''} onChange={e => setDevForm(p => ({ ...p, salaryPeriod: (e.target.value as SalaryPeriod) || null }))} options={SALARY_PERIODS.map(v => ({ value: v, label: SALARY_PERIOD_LABELS[v] }))} disabled={saving} />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button size="sm" isLoading={saving} onClick={() => saveDevSection('salary')}>{saving ? 'Saving…' : 'Save'}</Button>
                            <Button variant="ghost" size="sm" onClick={closePanel} disabled={saving}>Cancel</Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <Row label="Range" value={
                            profile?.salaryMin != null && profile?.salaryMax != null
                                ? `${profile.currency ?? ''} ${profile.salaryMin.toLocaleString()} – ${profile.salaryMax.toLocaleString()} ${profile.salaryPeriod ? SALARY_PERIOD_LABELS[profile.salaryPeriod] : ''}`
                                : null
                        } />
                        <Button variant="secondary" size="sm" onClick={() => openPanel('salary')}>Edit</Button>
                    </>
                )}
            </Section>

            {/* ── PORTFOLIO ────────────────────────────────────────────────── */}
            <Section title="Portfolio">
                {editingPanel === 'portfolio' ? (
                    <div className="space-y-4">
                        {saveError && <AlertBanner type="error" message={saveError} />}
                        <Input label="Portfolio URL" type="url" placeholder="https://yourportfolio.com" value={devForm.portfolioUrl ?? ''} onChange={e => setDevForm(p => ({ ...p, portfolioUrl: e.target.value }))} disabled={saving} />
                        <div className="flex gap-3 pt-2">
                            <Button size="sm" isLoading={saving} onClick={() => saveDevSection('portfolio')}>{saving ? 'Saving…' : 'Save'}</Button>
                            <Button variant="ghost" size="sm" onClick={closePanel} disabled={saving}>Cancel</Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <Row label="Portfolio URL" value={profile?.portfolioUrl ? (
                            <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 underline break-all">
                                {profile.portfolioUrl}
                            </a>
                        ) : null} />
                        <Button variant="secondary" size="sm" onClick={() => openPanel('portfolio')}>Edit</Button>
                    </>
                )}
            </Section>
        </div>
    );
}

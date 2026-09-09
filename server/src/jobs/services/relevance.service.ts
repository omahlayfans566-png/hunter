import { DeveloperProfileModel } from '../../models/DeveloperProfile';

/**
 * 0–100 developer-relevance score for a job against a user's saved profile.
 *
 * Score breakdown (max 100):
 *   Skill match          0–40 pts   — how many of the user's skills appear in title/tags/description
 *   Title heuristic      0–25 pts   — developer role keyword in job title
 *   Location match       0–15 pts   — job location matches user's preferred locations / remote pref
 *   Employment type       0–10 pts   — job type matches user's preferred job types
 *   Preferred title       0–10 pts   — job title matches user's professional title keywords
 *
 * When no profile exists the function falls back to the title heuristic only.
 */

// ── Title heuristic terms (applied regardless of profile) ─────────────────

const TITLE_TERMS: Record<string, number> = {
    'next.js': 25,
    'react native': 24,
    'react developer': 24,
    'react engineer': 24,
    frontend: 22,
    'front-end': 22,
    'full-stack': 22,
    'full stack': 22,
    fullstack: 22,
    typescript: 20,
    javascript: 20,
    'software engineer': 22,
    'software developer': 22,
    backend: 20,
    'back-end': 20,
    'node.js': 20,
    nodejs: 20,
    'web developer': 18,
    flutter: 18,
    'mobile developer': 18,
    android: 16,
    ios: 16,
    devops: 16,
    'cloud engineer': 16,
    developer: 14,
    engineer: 12,
};

// ── Employment type mapping ────────────────────────────────────────────────

const EMPLOYMENT_NORM: Record<string, string> = {
    FULL_TIME: 'full',
    PART_TIME: 'part',
    CONTRACT: 'contract',
    FREELANCE: 'freelance',
    INTERNSHIP: 'intern',
    TEMPORARY: 'temp',
};

// ── Main scoring function ─────────────────────────────────────────────────

export interface JobForScoring {
    title?: string;
    tags?: string[];
    description?: string;
    country?: string | null;
    location?: string | null;
    remoteType?: string;
    employmentType?: string | null;
}

export async function computeMatchScore(
    job: JobForScoring,
    userId?: string,
): Promise<number> {
    // Load user profile — by userId when available, else first profile in DB
    const profile = userId
        ? await DeveloperProfileModel.findOne({ userId }, {
            skills: 1,
            workPreferences: 1,
            jobTypes: 1,
            preferredCountries: 1,
            preferredCities: 1,
            remoteWorldwide: 1,
            professionalTitle: 1,
            primarySpecialization: 1,
            country: 1,
            location: 1,
        }).lean()
        : await DeveloperProfileModel.findOne({}, {
            skills: 1,
            workPreferences: 1,
            jobTypes: 1,
            preferredCountries: 1,
            preferredCities: 1,
            remoteWorldwide: 1,
            professionalTitle: 1,
            primarySpecialization: 1,
            country: 1,
            location: 1,
        }).lean();

    const title = (job.title ?? '').toLowerCase();
    const tags = (job.tags ?? []).join(' ').toLowerCase();
    const desc = (job.description ?? '').slice(0, 1000).toLowerCase(); // only first 1000 chars
    const jobText = `${title} ${tags} ${desc}`;

    let score = 0;

    // ── 1. Skill match (0–40 pts) ──────────────────────────────────────────
    const skills = (profile?.skills ?? [])
        .map((s) => s.name.toLowerCase().trim())
        .filter(Boolean);

    if (skills.length > 0) {
        let hits = 0;
        for (const skill of skills) {
            // Check title (weighted higher), tags, and description
            if (title.includes(skill) || tags.includes(skill)) {
                hits += 1.5; // title/tag hit worth more
            } else if (desc.includes(skill)) {
                hits += 0.5;
            }
        }
        score += Math.min(40, Math.round((Math.min(hits, skills.length) / skills.length) * 40));
    } else {
        // No skills saved — give a small base so jobs aren't all scored 0
        score += 10;
    }

    // ── 2. Title heuristic (0–25 pts) ─────────────────────────────────────
    let titleScore = 0;
    for (const [term, pts] of Object.entries(TITLE_TERMS)) {
        if (title.includes(term)) {
            titleScore = Math.max(titleScore, pts);
        }
    }
    score += Math.min(25, titleScore);

    // ── 3. Location match (0–15 pts) ──────────────────────────────────────
    if (profile) {
        const jobCountry = (job.country ?? '').toLowerCase();
        const jobLocation = (job.location ?? '').toLowerCase();
        const jobRemote = job.remoteType === 'REMOTE';

        // Remote preference
        const prefersRemote =
            profile.remoteWorldwide === true ||
            (profile.workPreferences ?? []).includes('REMOTE');
        const prefersHybrid = (profile.workPreferences ?? []).includes('HYBRID');

        if (jobRemote && prefersRemote) {
            score += 15; // perfect remote match
        } else if (job.remoteType === 'HYBRID' && prefersHybrid) {
            score += 10;
        } else {
            // Country/city match
            const preferredCountries = (profile.preferredCountries ?? []).map((c) =>
                c.toLowerCase(),
            );
            const preferredCities = (profile.preferredCities ?? []).map((c) =>
                c.toLowerCase(),
            );
            const profileCountry = (profile.country ?? '').toLowerCase();

            const countryHit =
                (preferredCountries.length > 0 &&
                    preferredCountries.some(
                        (c) => jobCountry.includes(c) || jobLocation.includes(c),
                    )) ||
                (profileCountry && jobCountry.includes(profileCountry));

            const cityHit =
                preferredCities.length > 0 &&
                preferredCities.some((c) => jobLocation.includes(c));

            if (cityHit) score += 15;
            else if (countryHit) score += 10;
        }
    }

    // ── 4. Employment type match (0–10 pts) ───────────────────────────────
    if (profile?.jobTypes && profile.jobTypes.length > 0) {
        const jobEmpType = (job.employmentType ?? '').toLowerCase();
        const matched = profile.jobTypes.some((jt) => {
            const norm = EMPLOYMENT_NORM[jt] ?? jt.toLowerCase();
            return jobEmpType.includes(norm);
        });
        if (matched) score += 10;
    }

    // ── 5. Professional title keyword match (0–10 pts) ─────────────────────
    if (profile?.professionalTitle) {
        const profTitle = profile.professionalTitle.toLowerCase();
        // Extract key words from professional title
        const titleWords = profTitle
            .split(/\s+/)
            .filter((w) => w.length > 3)
            .filter((w) => !['and', 'the', 'for', 'with'].includes(w));

        const titleMatches = titleWords.filter((w) => jobText.includes(w));
        if (titleMatches.length > 0) {
            score += Math.min(10, Math.round((titleMatches.length / titleWords.length) * 10));
        }
    }

    return Math.max(0, Math.min(100, Math.round(score)));
}

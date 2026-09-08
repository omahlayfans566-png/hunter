import { DeveloperProfileModel } from '../../models/DeveloperProfile';

/**
 * 0–100 developer-relevance score for a job against the user's saved skills.
 * Powers default "most recent + active + relevant" ranking for the personal
 * AI Developer Job Hunter. Without a saved profile we fall back to a title
 * heuristic so genuine developer roles still rank well.
 */

const TITLE_PROFILE_TERMS: Record<string, number> = {
    frontend: 88,
    'front-end': 88,
    javascript: 85,
    typescript: 85,
    'next.js': 90,
    'full-stack': 88,
    'full stack': 88,
    fullstack: 88,
    backend: 82,
    'back-end': 80,
    'node.js': 82,
    nodejs: 82,
    'software developer': 82,
    'software engineer': 85,
    'web developer': 80,
    developer: 75,
    engineer: 75,
};

export async function computeMatchScore(job: { title?: string; tags?: string[] }): Promise<number> {
    const profile = await DeveloperProfileModel.findOne(
        {},
        { skills: 1 },
    ).lean();

    const title = (job.title ?? '').toLowerCase();
    const text = `${title} ${(job.tags ?? []).join(' ')}`.toLowerCase();
    let score = 0;

    // 1. Saved skills matched in title/tags.
    const skills = (profile?.skills ?? [])
        .map((s) => s.name.toLowerCase().trim())
        .filter(Boolean);

    if (skills.length > 0) {
        let hits = 0;
        for (const skill of skills) {
            if (text.includes(skill)) hits += 1;
        }
        if (hits > 0) score += Math.min(60, Math.round((hits / skills.length) * 60));
    }

    // 2. Developer title heuristic.
    let titleHits = 0;
    for (const term of Object.keys(TITLE_PROFILE_TERMS)) {
        if (title.includes(term)) titleHits += TITLE_PROFILE_TERMS[term];
    }
    score += Math.min(40, titleHits);

    return Math.max(0, Math.min(100, score));
}

/**
 * Developer-relevance filter used by broad boards (Remotive, Jobicy, ...).
 * A personal developer job hunter should not fill the database with sales jobs.
 * Matching is intentionally conservative: only clearly technical jobs pass.
 */
const DEVELOPER_CATEGORY_TERMS = [
    'software',
    'developer',
    'front-end',
    'front-end dev',
    'frontend',
    'back-end',
    'backend',
    'full-stack',
    'full stack',
    'fullstack',
    'devops',
    'sysadmin',
    'system administration',
    'data',
    'engineering',
    'engineer',
    'qa',
    'quality assurance',
    'mobile',
    'security',
    'cloud',
    'product',
];

const DEVELOPER_TITLE_TERMS = [
    'developer',
    'engineer',
    'software',
    'frontend',
    'front-end',
    'backend',
    'back-end',
    'full-stack',
    'fullstack',
    'devops',
    'programmer',
    'sre',
    'platform',
    'qa',
    'data engineer',
    'data scientist',
    'machine learning',
    'ml engineer',
    'web',
    'react',
    'node',
    'typescript',
    'javascript',
    'android',
    'ios',
    'mobile',
    'cloud',
    'security engineer',
    'technical support engineer',
    'infrastructure',
    'architect',
    'automation',
    'api',
    'unity',
    'gamedev',
    'game developer',
];

/** True when the category/tags suggest a developer-ish role. */
export function isDeveloperByCategory(category: string | null | undefined): boolean {
    if (!category) return false;
    const c = category.toLowerCase();
    return DEVELOPER_CATEGORY_TERMS.some((t) => c.includes(t));
}

/** True when the job title looks developer-relevant. */
export function isDeveloperByTitle(title: string | null | undefined): boolean {
    if (!title) return false;
    const t = title.toLowerCase();
    return DEVELOPER_TITLE_TERMS.some((term) => t.includes(term));
}
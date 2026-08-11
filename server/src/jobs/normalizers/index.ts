import { RemoteType, ApplicationMethod, SalaryPeriod } from '@prisma/client';

// ── Remote type normalization ────────────────────────────────────────────

const REMOTE_KEYWORDS = ['remote', 'anywhere', 'work from anywhere', 'fully remote', 'worldwide'];
const HYBRID_KEYWORDS = ['hybrid'];
const ON_SITE_KEYWORDS = ['on-site', 'onsite', 'in-office', 'in office', 'on site'];

export function normalizeRemoteType(
    location?: string | null,
    isRemote?: boolean,
): RemoteType {
    if (isRemote === true) return RemoteType.REMOTE;

    const loc = (location ?? '').toLowerCase();
    if (REMOTE_KEYWORDS.some((k) => loc.includes(k))) return RemoteType.REMOTE;
    if (HYBRID_KEYWORDS.some((k) => loc.includes(k))) return RemoteType.HYBRID;
    if (ON_SITE_KEYWORDS.some((k) => loc.includes(k))) return RemoteType.ON_SITE;

    return RemoteType.UNKNOWN;
}

// ── Employment type normalization ────────────────────────────────────────

export function normalizeEmploymentType(raw?: string | null): string | null {
    if (!raw) return null;
    const r = raw.toLowerCase();
    if (r.includes('full')) return 'Full-time';
    if (r.includes('part')) return 'Part-time';
    if (r.includes('contract')) return 'Contract';
    if (r.includes('freelance')) return 'Freelance';
    if (r.includes('intern')) return 'Internship';
    if (r.includes('temp')) return 'Temporary';
    return raw.trim();
}

// ── Application method ───────────────────────────────────────────────────

export function determineApplicationMethod(
    applicationUrl?: string | null,
    originalUrl?: string | null,
): ApplicationMethod {
    if (applicationUrl) return ApplicationMethod.EXTERNAL;
    if (originalUrl) return ApplicationMethod.MANUAL;
    return ApplicationMethod.UNKNOWN;
}

// ── Country extraction ───────────────────────────────────────────────────

const COUNTRY_PATTERNS: Record<string, string> = {
    'united states': 'United States',
    ' us ': 'United States',
    ', us': 'United States',
    '(us)': 'United States',
    'united kingdom': 'United Kingdom',
    ' uk ': 'United Kingdom',
    ', uk': 'United Kingdom',
    '(uk)': 'United Kingdom',
    germany: 'Germany',
    deutschland: 'Germany',
    france: 'France',
    canada: 'Canada',
    australia: 'Australia',
    nigeria: 'Nigeria',
    netherlands: 'Netherlands',
    remote: null,
};

export function extractCountry(location?: string | null): string | null {
    if (!location) return null;
    const loc = location.toLowerCase();
    for (const [pattern, country] of Object.entries(COUNTRY_PATTERNS)) {
        if (loc.includes(pattern)) return country;
    }
    return null;
}

// ── Salary normalization ─────────────────────────────────────────────────

export function normalizeSalaryPeriod(raw?: string | null): SalaryPeriod | null {
    if (!raw) return null;
    const r = raw.toLowerCase();
    if (r.includes('hour') || r.includes('/h') || r.includes('hr')) return SalaryPeriod.HOURLY;
    if (r.includes('month')) return SalaryPeriod.MONTHLY;
    if (r.includes('year') || r.includes('annual') || r.includes('/yr') || r.includes('pa')) return SalaryPeriod.YEARLY;
    return null;
}

// ── String sanitization ──────────────────────────────────────────────────

export function sanitizeHtml(html: string): string {
    return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

export function truncate(str: string, max: number): string {
    return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

// ── URL validation ───────────────────────────────────────────────────────

export function isValidUrl(url: string): boolean {
    try {
        const u = new URL(url);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
}

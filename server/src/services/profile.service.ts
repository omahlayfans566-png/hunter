import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../utils/AppError';

// ── Types ──────────────────────────────────────────────────────────────────

export interface UpdateDeveloperProfileInput {
    professionalTitle?: string | null;
    bio?: string | null;
    yearsOfExperience?: number | null;
    experienceLevel?: string | null;
    primarySpecialization?: string | null;
    secondarySpecializations?: string[];
    location?: string | null;
    country?: string | null;
    timezone?: string | null;
    remoteWorldwide?: boolean;
    preferredCountries?: string[];
    preferredCities?: string[];
    jobTypes?: string[];
    workPreferences?: string[];
    salaryMin?: number | null;
    salaryMax?: number | null;
    currency?: string | null;
    salaryPeriod?: string | null;
    availability?: string | null;
    portfolioUrl?: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const PROFILE_INCLUDE = {
    skills: { orderBy: { name: 'asc' as const } },
} satisfies Prisma.DeveloperProfileInclude;

/** Trim a string; empty-string becomes null so blank inputs clear the field. */
function emptyToNull(value: string | null | undefined): string | null | undefined {
    if (value === undefined || value === null) return value;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}

function normalizeList(value: string[] | undefined): string[] | undefined {
    if (value === undefined) return undefined;
    return value.map((s) => s.trim()).filter((s) => s.length > 0);
}
/**
 * Profile completion percentage (0–100), derived from actual profile data.
 * Weights are aligned to the Phase 2 feature set. Total possible = 100.
 */
export function calculateCompletion(profile: {
    professionalTitle?: string | null;
    bio?: string | null;
    yearsOfExperience?: number | null;
    experienceLevel?: string | null;
    primarySpecialization?: string | null;
    skills?: unknown[];
    jobTypes?: string[];
    workPreferences?: string[];
    remoteWorldwide?: boolean;
    preferredCountries?: string[];
    preferredCities?: string[];
    salaryMin?: number | null;
    salaryMax?: number | null;
    currency?: string | null;
    salaryPeriod?: string | null;
    availability?: string | null;
    portfolioUrl?: string | null;
}): number {
    let score = 0;
    if (profile.professionalTitle) score += 10;
    if (profile.bio) score += 10;
    if (profile.experienceLevel) score += 10;
    if (profile.yearsOfExperience !== null && profile.yearsOfExperience !== undefined) score += 5;
    if (profile.primarySpecialization) score += 10;
    if (profile.skills && profile.skills.length > 0) score += 10;
    if (profile.jobTypes && profile.jobTypes.length > 0) score += 10;
    if (profile.workPreferences && profile.workPreferences.length > 0) score += 10;
    if (
        profile.remoteWorldwide ||
        (profile.preferredCountries && profile.preferredCountries.length > 0) ||
        (profile.preferredCities && profile.preferredCities.length > 0)
    ) {
        score += 10;
    }
    if (
        profile.salaryMin !== null &&
        profile.salaryMin !== undefined &&
        profile.salaryMax !== null &&
        profile.salaryMax !== undefined &&
        profile.currency &&
        profile.salaryPeriod
    ) {
        score += 5;
    }
    if (profile.availability) score += 5;
    if (profile.portfolioUrl) score += 5;
    return score; // max 100
}

function toApiProfile(profile: Prisma.DeveloperProfileGetPayload<{ include: typeof PROFILE_INCLUDE }>) {
    const { skills, ...rest } = profile;
    return {
        ...rest,
        skills: (skills ?? []).map(({ id, name, category, proficiency }) => ({ id, name, category, proficiency })),
        completion: calculateCompletion(profile),
    };
}

function buildData(input: UpdateDeveloperProfileInput): Prisma.DeveloperProfileUncheckedUpdateInput {
    const data: Prisma.DeveloperProfileUncheckedUpdateInput = {};

    if (input.professionalTitle !== undefined) data.professionalTitle = emptyToNull(input.professionalTitle);
    if (input.bio !== undefined) data.bio = emptyToNull(input.bio);
    if (input.yearsOfExperience !== undefined) data.yearsOfExperience = input.yearsOfExperience;
    if (input.experienceLevel !== undefined) data.experienceLevel = input.experienceLevel as never;
    if (input.primarySpecialization !== undefined) data.primarySpecialization = input.primarySpecialization as never;
    if (input.secondarySpecializations !== undefined) {
        data.secondarySpecializations = input.secondarySpecializations as never;
    }
    if (input.location !== undefined) data.location = emptyToNull(input.location);
    if (input.country !== undefined) data.country = emptyToNull(input.country);
    if (input.timezone !== undefined) data.timezone = emptyToNull(input.timezone);
    if (input.remoteWorldwide !== undefined) data.remoteWorldwide = input.remoteWorldwide;
    if (input.preferredCountries !== undefined) data.preferredCountries = normalizeList(input.preferredCountries) ?? [];
    if (input.preferredCities !== undefined) data.preferredCities = normalizeList(input.preferredCities) ?? [];
    if (input.jobTypes !== undefined) data.jobTypes = input.jobTypes as never;
    if (input.workPreferences !== undefined) data.workPreferences = input.workPreferences as never;
    if (input.salaryMin !== undefined) data.salaryMin = input.salaryMin;
    if (input.salaryMax !== undefined) data.salaryMax = input.salaryMax;
    if (input.currency !== undefined) data.currency = emptyToNull(input.currency)?.toUpperCase();
    if (input.salaryPeriod !== undefined) data.salaryPeriod = input.salaryPeriod as never;
    if (input.availability !== undefined) data.availability = input.availability as never;
    if (input.portfolioUrl !== undefined) data.portfolioUrl = emptyToNull(input.portfolioUrl);

    return data;
}
// ── Service ────────────────────────────────────────────────────────────────

export const profileService = {
    /** Combined payload: user identity + developer profile (with skills + completion). */
    async getProfile(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, firstName: true, lastName: true, email: true, createdAt: true },
        });

        if (!user) {
            throw new AppError('User not found.', 404);
        }

        const profile = await prisma.developerProfile.findUnique({
            where: { userId },
            include: PROFILE_INCLUDE,
        });

        return { user, profile: profile ? toApiProfile(profile) : null };
    },

    /** Create or fully update the authenticated user's developer profile. */
    async upsertProfile(userId: string, input: UpdateDeveloperProfileInput) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!user) {
            throw new AppError('User not found.', 404);
        }

        const data = buildData(input);
        const profile = await prisma.developerProfile.upsert({
            where: { userId },
            update: data,
            create: { userId, ...data },
            include: PROFILE_INCLUDE,
        });

        return toApiProfile(profile);
    },

    /** Phase 1 compatibility: update first/last name on the User record. */
    async updateNames(userId: string, names: { firstName?: string; lastName?: string }) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new AppError('User not found.', 404);
        }

        return prisma.user.update({
            where: { id: userId },
            data: {
                ...(names.firstName !== undefined && { firstName: names.firstName }),
                ...(names.lastName !== undefined && { lastName: names.lastName }),
            },
            select: { id: true, firstName: true, lastName: true, email: true, createdAt: true },
        });
    },
};
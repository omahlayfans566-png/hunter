import { UserModel } from '../models/User';
import { DeveloperProfileModel, IDeveloperProfile } from '../models/DeveloperProfile';
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
 * Profile completion percentage (0–100).
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

/** Convert a Mongoose DeveloperProfile document to the API response shape. */
function toApiProfile(profile: IDeveloperProfile) {
    const obj = profile.toJSON();
    return {
        ...obj,
        skills: (profile.skills ?? []).map((s) => ({
            id: s._id.toString(),
            name: s.name,
            category: s.category ?? null,
            proficiency: s.proficiency,
        })),
        completion: calculateCompletion({
            ...obj,
            skills: profile.skills,
        }),
    };
}

/** Build a MongoDB $set object from the input, only including defined fields. */
function buildUpdateFields(input: UpdateDeveloperProfileInput): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    if (input.professionalTitle !== undefined) data.professionalTitle = emptyToNull(input.professionalTitle) ?? null;
    if (input.bio !== undefined) data.bio = emptyToNull(input.bio) ?? null;
    if (input.yearsOfExperience !== undefined) data.yearsOfExperience = input.yearsOfExperience;
    if (input.experienceLevel !== undefined) data.experienceLevel = input.experienceLevel ?? null;
    if (input.primarySpecialization !== undefined) data.primarySpecialization = input.primarySpecialization ?? null;
    if (input.secondarySpecializations !== undefined)
        data.secondarySpecializations = input.secondarySpecializations;
    if (input.location !== undefined) data.location = emptyToNull(input.location) ?? null;
    if (input.country !== undefined) data.country = emptyToNull(input.country) ?? null;
    if (input.timezone !== undefined) data.timezone = emptyToNull(input.timezone) ?? null;
    if (input.remoteWorldwide !== undefined) data.remoteWorldwide = input.remoteWorldwide;
    if (input.preferredCountries !== undefined)
        data.preferredCountries = normalizeList(input.preferredCountries) ?? [];
    if (input.preferredCities !== undefined)
        data.preferredCities = normalizeList(input.preferredCities) ?? [];
    if (input.jobTypes !== undefined) data.jobTypes = input.jobTypes;
    if (input.workPreferences !== undefined) data.workPreferences = input.workPreferences;
    if (input.salaryMin !== undefined) data.salaryMin = input.salaryMin;
    if (input.salaryMax !== undefined) data.salaryMax = input.salaryMax;
    if (input.currency !== undefined)
        data.currency = emptyToNull(input.currency)?.toUpperCase() ?? null;
    if (input.salaryPeriod !== undefined) data.salaryPeriod = input.salaryPeriod ?? null;
    if (input.availability !== undefined) data.availability = input.availability ?? null;
    if (input.portfolioUrl !== undefined) data.portfolioUrl = emptyToNull(input.portfolioUrl) ?? null;

    return data;
}

// ── Service ────────────────────────────────────────────────────────────────

export const profileService = {
    /** Combined payload: user identity + developer profile (with skills + completion). */
    async getProfile(userId: string) {
        const user = await UserModel.findById(userId).select(
            'firstName lastName email createdAt',
        );

        if (!user) throw new AppError('User not found.', 404);

        const profile = await DeveloperProfileModel.findOne({ userId });

        return {
            user: {
                id: user._id.toString(),
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                createdAt: user.createdAt,
            },
            profile: profile ? toApiProfile(profile) : null,
        };
    },

    /** Create or fully update the authenticated user's developer profile. */
    async upsertProfile(userId: string, input: UpdateDeveloperProfileInput) {
        const user = await UserModel.findById(userId).select('_id');
        if (!user) throw new AppError('User not found.', 404);

        const updateFields = buildUpdateFields(input);

        const profile = await DeveloperProfileModel.findOneAndUpdate(
            { userId },
            { $set: updateFields },
            { new: true, upsert: true, setDefaultsOnInsert: true },
        );

        return toApiProfile(profile!);
    },

    /** Phase 1 compatibility: update first/last name on the User record. */
    async updateNames(userId: string, names: { firstName?: string; lastName?: string }) {
        const user = await UserModel.findById(userId);
        if (!user) throw new AppError('User not found.', 404);

        const updateData: Record<string, string> = {};
        if (names.firstName !== undefined) updateData.firstName = names.firstName;
        if (names.lastName !== undefined) updateData.lastName = names.lastName;

        const updated = await UserModel.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, select: 'firstName lastName email createdAt' },
        );

        return {
            id: updated!._id.toString(),
            firstName: updated!.firstName,
            lastName: updated!.lastName,
            email: updated!.email,
            createdAt: updated!.createdAt,
        };
    },
};

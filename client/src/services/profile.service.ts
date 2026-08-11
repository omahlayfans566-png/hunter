import api from './api';
import { DeveloperProfile, DeveloperProfileInput, ProfileResponse, Skill, User } from '../types';

// ── Profile ───────────────────────────────────────────────────────────────

/** Returns combined { user, profile } — profile may be null on first visit. */
export async function getFullProfile(): Promise<ProfileResponse> {
    const res = await api.get('/profile');
    return res.data.data as ProfileResponse;
}

/** PUT — creates or replaces the developer profile. */
export async function saveDeveloperProfile(data: DeveloperProfileInput): Promise<DeveloperProfile> {
    const res = await api.put('/profile', data);
    return res.data.data.profile as DeveloperProfile;
}

/** PATCH — Phase 1 compatibility: update first/last name only. */
export async function updateUserNames(data: { firstName?: string; lastName?: string }): Promise<User> {
    const res = await api.patch('/profile', data);
    return res.data.data.user as User;
}

// ── Skills ────────────────────────────────────────────────────────────────

export interface SkillsResponse {
    skills: Skill[];
    completion: number;
}

export async function listSkills(): Promise<SkillsResponse> {
    const res = await api.get('/profile/skills');
    return res.data.data as SkillsResponse;
}

export async function createSkill(data: {
    name: string;
    proficiency: string;
    category?: string | null;
}): Promise<SkillsResponse> {
    const res = await api.post('/profile/skills', data);
    return res.data.data as SkillsResponse;
}

export async function updateSkill(
    id: string,
    data: { name?: string; proficiency?: string; category?: string | null },
): Promise<SkillsResponse> {
    const res = await api.patch(`/profile/skills/${id}`, data);
    return res.data.data as SkillsResponse;
}

export async function deleteSkill(id: string): Promise<SkillsResponse> {
    const res = await api.delete(`/profile/skills/${id}`);
    return res.data.data as SkillsResponse;
}

// Legacy export for Phase 1 ProfilePage compatibility
export const profileService = {
    async getProfile(): Promise<User> {
        const res = await api.get('/profile');
        return res.data.data.user as User;
    },
    async updateProfile(data: { firstName?: string; lastName?: string }): Promise<User> {
        const res = await api.patch('/profile', data);
        return res.data.data.user as User;
    },
};

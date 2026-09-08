import mongoose from 'mongoose';
import { DeveloperProfileModel } from '../models/DeveloperProfile';
import { AppError } from '../utils/AppError';
import { calculateCompletion } from './profile.service';

/** Get-or-create the developer profile row so skills always have a home. */
async function ensureProfile(userId: string) {
    const profile = await DeveloperProfileModel.findOneAndUpdate(
        { userId },
        { $setOnInsert: { userId } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return profile!;
}

function skillsResponse(profile: Awaited<ReturnType<typeof ensureProfile>>) {
    const skills = (profile.skills ?? []).map((s) => ({
        id: s._id.toString(),
        name: s.name,
        category: s.category ?? null,
        proficiency: s.proficiency,
    }));
    const completion = calculateCompletion({ ...profile.toJSON(), skills: profile.skills });
    return { skills, completion };
}

export const skillService = {
    async listSkills(userId: string) {
        const profile = await ensureProfile(userId);
        return skillsResponse(profile);
    },

    async createSkill(
        userId: string,
        input: { name: string; proficiency: string; category?: string | null },
    ) {
        const profile = await ensureProfile(userId);
        const name = input.name.trim();

        // Duplicate check — case-insensitive
        const duplicate = profile.skills.find(
            (s) => s.name.toLowerCase() === name.toLowerCase(),
        );
        if (duplicate) {
            throw new AppError(`You already have "${name}" in your skills.`, 409);
        }

        const newSkill = {
            _id: new mongoose.Types.ObjectId(),
            name,
            category: input.category ?? null,
            proficiency: input.proficiency,
        };

        const updated = await DeveloperProfileModel.findOneAndUpdate(
            { userId },
            { $push: { skills: newSkill } },
            { new: true },
        );

        return skillsResponse(updated!);
    },

    async updateSkill(
        userId: string,
        skillId: string,
        input: { name?: string; proficiency?: string; category?: string | null },
    ) {
        const profile = await ensureProfile(userId);

        const skill = profile.skills.find((s) => s._id.toString() === skillId);
        if (!skill) throw new AppError('Skill not found.', 404);

        if (input.name !== undefined) {
            const name = input.name.trim();
            if (!name) throw new AppError('Skill name cannot be empty.', 400);

            // Duplicate check excluding this skill
            const duplicate = profile.skills.find(
                (s) => s._id.toString() !== skillId && s.name.toLowerCase() === name.toLowerCase(),
            );
            if (duplicate) throw new AppError(`You already have "${name}" in your skills.`, 409);
        }

        // Build positional $set fields
        const setFields: Record<string, unknown> = {};
        if (input.name !== undefined) setFields['skills.$.name'] = input.name.trim();
        if (input.proficiency !== undefined) setFields['skills.$.proficiency'] = input.proficiency;
        if (input.category !== undefined) setFields['skills.$.category'] = input.category ?? null;
        setFields['skills.$.updatedAt'] = new Date();

        const updated = await DeveloperProfileModel.findOneAndUpdate(
            { userId, 'skills._id': new mongoose.Types.ObjectId(skillId) },
            { $set: setFields },
            { new: true },
        );

        if (!updated) throw new AppError('Skill not found.', 404);
        return skillsResponse(updated);
    },

    async deleteSkill(userId: string, skillId: string) {
        const profile = await ensureProfile(userId);

        const skill = profile.skills.find((s) => s._id.toString() === skillId);
        if (!skill) throw new AppError('Skill not found.', 404);

        const updated = await DeveloperProfileModel.findOneAndUpdate(
            { userId },
            { $pull: { skills: { _id: new mongoose.Types.ObjectId(skillId) } } },
            { new: true },
        );

        return skillsResponse(updated!);
    },
};

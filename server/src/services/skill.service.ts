import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { calculateCompletion } from './profile.service';

const SKILL_SELECT = {
    id: true,
    name: true,
    category: true,
    proficiency: true,
} as const;

/** Get-or-create the developer profile row so skills always have a home. */
async function ensureProfile(userId: string) {
    return prisma.developerProfile.upsert({
        where: { userId },
        update: {},
        create: { userId },
    });
}

async function getSkillsForProfile(profileId: string) {
    return prisma.profileSkill.findMany({
        where: { profileId },
        orderBy: { name: 'asc' },
        select: SKILL_SELECT,
    });
}

async function recomputeCompletion(userId: string): Promise<number> {
    const profile = await prisma.developerProfile.findUnique({
        where: { userId },
        include: { skills: true },
    });
    return profile ? calculateCompletion(profile) : 0;
}

export const skillService = {
    async listSkills(userId: string) {
        const profile = await ensureProfile(userId);
        const skills = await getSkillsForProfile(profile.id);
        return { skills, completion: await recomputeCompletion(userId) };
    },

    async createSkill(userId: string, input: { name: string; proficiency: string; category?: string | null }) {
        const profile = await ensureProfile(userId);
        const name = input.name.trim();

        const duplicate = await prisma.profileSkill.findFirst({
            where: { profileId: profile.id, name: { equals: name, mode: 'insensitive' } },
        });
        if (duplicate) {
            throw new AppError(`You already have "${name}" in your skills.`, 409);
        }

        const data: Prisma.ProfileSkillUncheckedCreateInput = {
            profileId: profile.id,
            name,
            proficiency: input.proficiency as never,
        };
        if (input.category) data.category = input.category as never;

        await prisma.profileSkill.create({ data });

        const skills = await getSkillsForProfile(profile.id);
        return { skills, completion: await recomputeCompletion(userId) };
    },

    async updateSkill(
        userId: string,
        skillId: string,
        input: { name?: string; proficiency?: string; category?: string | null },
    ) {
        const owned = await prisma.profileSkill.findFirst({
            where: { id: skillId, profile: { userId } },
        });
        if (!owned) {
            throw new AppError('Skill not found.', 404);
        }

        const data: Prisma.ProfileSkillUncheckedUpdateInput = {};

        if (input.name !== undefined) {
            const name = input.name.trim();
            if (!name) {
                throw new AppError('Skill name cannot be empty.', 400);
            }
            const duplicate = await prisma.profileSkill.findFirst({
                where: {
                    profileId: owned.profileId,
                    name: { equals: name, mode: 'insensitive' },
                    NOT: { id: skillId },
                },
            });
            if (duplicate) {
                throw new AppError(`You already have "${name}" in your skills.`, 409);
            }
            data.name = name;
        }
        if (input.proficiency !== undefined) data.proficiency = input.proficiency as never;
        if (input.category !== undefined) data.category = input.category as never;

        await prisma.profileSkill.update({ where: { id: skillId }, data });

        const skills = await getSkillsForProfile(owned.profileId);
        return { skills, completion: await recomputeCompletion(userId) };
    },

    async deleteSkill(userId: string, skillId: string) {
        const owned = await prisma.profileSkill.findFirst({
            where: { id: skillId, profile: { userId } },
        });
        if (!owned) {
            throw new AppError('Skill not found.', 404);
        }

        await prisma.profileSkill.delete({ where: { id: skillId } });

        const skills = await getSkillsForProfile(owned.profileId);
        return { skills, completion: await recomputeCompletion(userId) };
    },
};
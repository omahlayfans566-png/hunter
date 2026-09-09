import { Response, NextFunction } from 'express';
import { jobService } from '../services/job.service';
import { runIngestion } from '../services/ingestion.service';
import { getRegisteredSources } from '../sources/registry';
import { AuthRequest } from '../../types';
import { JobStatus } from '../../models/enums';

export const jobController = {
    async getJobs(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const {
                keyword, remote, country, location, employmentType,
                source, status, newToday, activeNow, postedWithin, page, limit, sortBy,
            } = req.query;

            const result = await jobService.searchJobs({
                keyword: keyword as string | undefined,
                remote: remote === 'true' ? true : remote === 'false' ? false : undefined,
                country: country as string | undefined,
                location: location as string | undefined,
                employmentType: employmentType as string | undefined,
                source: source as string | undefined,
                status: status ? (status as JobStatus) : undefined,
                newToday: newToday === 'true',
                activeNow: activeNow === 'true',
                postedWithin: postedWithin ? parseInt(postedWithin as string) : undefined,
                page: page ? parseInt(page as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined,
                sortBy: (sortBy as 'newest' | 'oldest' | 'company' | 'relevance') || 'relevance',
                userId: req.user?.userId,
            });

            res.status(200).json({ success: true, data: result });
        } catch (err) { next(err); }
    },

    async getJobById(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const job = await jobService.getJobById(String(req.params.id));
            if (!job) {
                res.status(404).json({ success: false, message: 'Job not found.' });
                return;
            }
            res.status(200).json({ success: true, data: { job } });
        } catch (err) { next(err); }
    },

    async getStats(_req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const stats = await jobService.getStats();
            res.status(200).json({ success: true, data: { stats } });
        } catch (err) { next(err); }
    },

    async getCountries(_req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const countries = await jobService.getDistinctCountries();
            res.status(200).json({ success: true, data: { countries } });
        } catch (err) { next(err); }
    },

    async getSourceHealth(_req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const [dbHealth, sourceStatuses] = await Promise.all([
                jobService.getSourceHealth(),
                Promise.resolve(getRegisteredSources().map((s) => s.getStatus())),
            ]);
            res.status(200).json({ success: true, data: { health: dbHealth, sources: sourceStatuses } });
        } catch (err) { next(err); }
    },

    async getTopMatches(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
            const topMatches = await jobService.getTopMatches(userId, Math.min(20, Math.max(1, limit)));
            res.status(200).json({ success: true, data: { jobs: topMatches } });
        } catch (err) { next(err); }
    },

    async triggerIngestion(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const sourceName = req.query.source as string | undefined;
            const results = await runIngestion(sourceName);
            const totalNew = results.reduce((s, r) => s + r.saved, 0);
            const totalDupes = results.reduce((s, r) => s + r.duplicates, 0);
            const totalFetched = results.reduce((s, r) => s + r.fetched, 0);
            const sources = results.filter((r) => !r.skipped);
            res.status(200).json({
                success: true,
                message: `Ingestion complete. ${totalNew} new jobs found from ${sources.length} sources.`,
                data: { results, summary: { totalFetched, totalNew, totalDupes } },
            });
        } catch (err: unknown) {
            if (err instanceof Error && err.message.includes('Please wait')) {
                res.status(429).json({ success: false, message: err.message });
                return;
            }
            next(err);
        }
    },

    // ── Saved jobs ────────────────────────────────────────────────────────────

    async saveJob(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const jobId = String(req.params.id);
            const result = await jobService.saveJob(userId, jobId);
            res.status(200).json({ success: true, data: result });
        } catch (err: unknown) {
            if (err instanceof Error && err.message === 'Job not found') {
                res.status(404).json({ success: false, message: 'Job not found.' });
                return;
            }
            next(err);
        }
    },

    async unsaveJob(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const jobId = String(req.params.id);
            await jobService.unsaveJob(userId, jobId);
            res.status(200).json({ success: true, message: 'Job removed from saved.' });
        } catch (err) { next(err); }
    },

    async getSavedJobs(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const savedJobs = await jobService.getSavedJobs(userId);
            res.status(200).json({ success: true, data: { savedJobs, total: savedJobs.length } });
        } catch (err) { next(err); }
    },
};

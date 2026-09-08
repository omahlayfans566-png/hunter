import { Router } from 'express';
import { applicationService } from '../services/application.service';
import { authenticate } from '../../middleware/authenticate';
import { AuthRequest } from '../../types';
import { ApplicationListQuery } from '../types';

const router = Router();

router.use(authenticate);

const uid = (req: AuthRequest) => req.user!.userId;

// ── Application profile (combined) ─────────────────────────────────────────

router.get('/profile', async (req, res, next) => {
    try {
        const data = await applicationService.getCombinedProfile(uid(req));
        res.status(200).json({ success: true, data });
    } catch (err) { next(err); }
});

router.put('/profile', async (req, res, next) => {
    try {
        const data = await applicationService.upsertApplicationProfile(uid(req), req.body);
        res.status(200).json({ success: true, message: 'Application profile saved.', data });
    } catch (err) { next(err); }
});

// ── Resumes / CVs ──────────────────────────────────────────────────────────

router.get('/resumes', async (req, res, next) => {
    try {
        const data = await applicationService.listResumes(uid(req));
        res.status(200).json({ success: true, data });
    } catch (err) { next(err); }
});

router.post('/resumes', async (req, res, next) => {
    try {
        const fileBuffer = typeof req.body.fileData === 'string'
            ? Buffer.from(req.body.fileData, 'base64')
            : Buffer.alloc(0);
        const data = await applicationService.createResume(uid(req), req.body.meta, fileBuffer);
        res.status(201).json({ success: true, message: 'Resume uploaded.', data });
    } catch (err) { next(err); }
});

router.get('/resumes/:id/file', async (req, res, next) => {
    try {
        const resume = await applicationService.getResumeFile(uid(req), String(req.params.id));
        res.setHeader('Content-Type', resume.fileType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(resume.fileName)}"`);
        res.send(resume.fileData);
    } catch (err) { next(err); }
});

router.patch('/resumes/:id', async (req, res, next) => {
    try {
        const data = await applicationService.updateResume(uid(req), String(req.params.id), req.body);
        res.status(200).json({ success: true, message: 'Resume updated.', data });
    } catch (err) { next(err); }
});

router.delete('/resumes/:id', async (req, res, next) => {
    try {
        const data = await applicationService.deleteResume(uid(req), String(req.params.id));
        res.status(200).json({ success: true, message: 'Resume deleted.', data });
    } catch (err) { next(err); }
});

// ── Cover letters ──────────────────────────────────────────────────────────

router.get('/cover-letters', async (req, res, next) => {
    try {
        const data = await applicationService.listCoverLetters(uid(req));
        res.status(200).json({ success: true, data });
    } catch (err) { next(err); }
});

router.post('/cover-letters', async (req, res, next) => {
    try {
        const data = await applicationService.createCoverLetter(uid(req), req.body);
        res.status(201).json({ success: true, message: 'Cover letter saved.', data });
    } catch (err) { next(err); }
});

router.patch('/cover-letters/:id', async (req, res, next) => {
    try {
        const data = await applicationService.updateCoverLetter(uid(req), String(req.params.id), req.body);
        res.status(200).json({ success: true, message: 'Cover letter updated.', data });
    } catch (err) { next(err); }
});

router.delete('/cover-letters/:id', async (req, res, next) => {
    try {
        const data = await applicationService.deleteCoverLetter(uid(req), String(req.params.id));
        res.status(200).json({ success: true, message: 'Cover letter deleted.', data });
    } catch (err) { next(err); }
});
// ── Application tracker ────────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
    try {
        const query = req.query as ApplicationListQuery;
        const data = await applicationService.getApplications(uid(req), query);
        res.status(200).json({ success: true, data });
    } catch (err) { next(err); }
});

router.get('/stats', async (req, res, next) => {
    try {
        const data = await applicationService.getApplicationStats(uid(req));
        res.status(200).json({ success: true, data });
    } catch (err) { next(err); }
});

router.get('/for-job/:jobId', async (req, res, next) => {
    try {
        const data = await applicationService.getApplicationForJob(uid(req), String(req.params.jobId));
        res.status(200).json({ success: true, data });
    } catch (err) { next(err); }
});

router.get('/prepare/:jobId', async (req, res, next) => {
    try {
        const data = await applicationService.prepareApplication(uid(req), String(req.params.jobId));
        res.status(200).json({ success: true, data });
    } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
    try {
        const data = await applicationService.createApplication(uid(req), req.body);
        res.status(201).json({ success: true, message: 'Application saved to tracker.', data });
    } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
    try {
        const data = await applicationService.getApplicationById(uid(req), String(req.params.id));
        res.status(200).json({ success: true, data });
    } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
    try {
        const data = await applicationService.updateApplication(uid(req), String(req.params.id), req.body);
        res.status(200).json({ success: true, message: 'Application updated.', data });
    } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
    try {
        const data = await applicationService.deleteApplication(uid(req), String(req.params.id));
        res.status(200).json({ success: true, message: 'Application removed.', data });
    } catch (err) { next(err); }
});

// ── Interviews ─────────────────────────────────────────────────────────────

router.post('/:id/interviews', async (req, res, next) => {
    try {
        const data = await applicationService.createInterview(uid(req), String(req.params.id), req.body);
        res.status(201).json({ success: true, message: 'Interview added.', data });
    } catch (err) { next(err); }
});

router.patch('/interviews/:interviewId', async (req, res, next) => {
    try {
        const data = await applicationService.updateInterview(uid(req), String(req.params.interviewId), req.body);
        res.status(200).json({ success: true, message: 'Interview updated.', data });
    } catch (err) { next(err); }
});

router.delete('/interviews/:interviewId', async (req, res, next) => {
    try {
        const data = await applicationService.deleteInterview(uid(req), String(req.params.interviewId));
        res.status(200).json({ success: true, message: 'Interview removed.', data });
    } catch (err) { next(err); }
});

export default router;
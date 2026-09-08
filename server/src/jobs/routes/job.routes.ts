import { Router } from 'express';
import { jobController } from '../controllers/job.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

// All job routes require authentication
router.use(authenticate);

// GET /api/jobs — search/list jobs with filters + pagination
router.get('/', jobController.getJobs);

// GET /api/jobs/stats — total/active/remote/today counts
router.get('/stats', jobController.getStats);

// GET /api/jobs/sources — source health status
router.get('/sources', jobController.getSourceHealth);

// GET /api/jobs/countries — distinct countries in active jobs (LOCATION filter)
router.get('/countries', jobController.getCountries);

// GET /api/jobs/saved — current user's saved jobs
router.get('/saved', jobController.getSavedJobs);

// POST /api/jobs/ingest — trigger manual job ingestion
router.post('/ingest', jobController.triggerIngestion);

// GET /api/jobs/:id — single job detail
router.get('/:id', jobController.getJobById);

// POST /api/jobs/:id/save — save a job for the current user
router.post('/:id/save', jobController.saveJob);

// DELETE /api/jobs/:id/save — remove a saved job
router.delete('/:id/save', jobController.unsaveJob);

export default router;

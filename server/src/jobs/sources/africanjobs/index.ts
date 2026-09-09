/**
 * AfricanJobs Source
 *
 * Dedicated Nigeria/Africa developer job aggregator.
 *
 * STATUS (September 2026):
 * - Jobberman RSS (jobberman.com/feeds/jobs.rss) → 404 (endpoint removed)
 * - MyJobMag RSS (myjobmag.com/feed/) → 404 (feed discontinued)
 * - NGCareers RSS (ngcareers.com/feed/) → 404 (site down)
 *
 * Nigeria coverage is currently provided by:
 *  1. Jooble (when JOOBLE_API_KEY is set) — strongly recommended for Nigeria
 *  2. Arbeitnow — occasionally includes Nigerian remote roles
 *  3. Remotive / Jobicy — worldwide remote roles open to Nigeria
 *
 * This source will be re-enabled automatically when a reliable Nigerian
 * job API/feed becomes available. It currently reports UNAVAILABLE and
 * returns 0 jobs without crashing the ingestion pipeline.
 *
 * TO ADD NIGERIA COVERAGE NOW:
 *   Register for a free Jooble API key at https://jooble.org/api/about
 *   and set JOOBLE_API_KEY in server/.env — Jooble queries Nigeria,
 *   Lagos, and Abuja specifically.
 */

import { JobSource, JobSourceResult, SourceStatusInfo } from '../../types';
import logger from '../../../lib/logger';

const SOURCE_NAME = 'africanjobs';

const STATUS_MESSAGE =
    'Nigerian job feeds (Jobberman, MyJobMag, NGCareers) have removed their public RSS/APIs. ' +
    'For Nigeria coverage, set JOOBLE_API_KEY in server/.env (free at jooble.org/api/about).';

let _lastStatus: SourceStatusInfo = {
    sourceName: SOURCE_NAME,
    status: 'UNAVAILABLE',
    message: STATUS_MESSAGE,
    requiresConfig: false,
};

export class AfricanJobsSource implements JobSource {
    readonly sourceName = SOURCE_NAME;

    async fetchJobs(): Promise<JobSourceResult> {
        logger.info(`[africanjobs] ${STATUS_MESSAGE}`);
        _lastStatus = {
            sourceName: SOURCE_NAME,
            status: 'UNAVAILABLE',
            message: STATUS_MESSAGE,
            requiresConfig: false,
        };
        // Return empty — ingestion continues with other sources
        return { jobs: [], error: STATUS_MESSAGE };
    }

    getStatus(): SourceStatusInfo {
        return _lastStatus;
    }
}

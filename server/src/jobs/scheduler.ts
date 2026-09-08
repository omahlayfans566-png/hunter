import { runIngestion } from '../jobs/services/ingestion.service';
import { getRegisteredSources, getSourceMinIntervalMs } from '../jobs/sources/registry';
import logger from '../lib/logger';

const MIN_INTERVAL_MS = 60 * 1000; // never refresh more often than every minute

let refreshTimer: NodeJS.Timeout | null = null;
let running = false;

async function refresh() {
    if (running) return;
    running = true;
    try {
        logger.info('[scheduler] Running scheduled job refresh');
        const results = await runIngestion(undefined, { scheduled: true });
        for (const r of results) {
            logger.info(
                `[scheduler] source=${r.source} fetched=${r.fetched} new=${r.saved} ` +
                `dupes=${r.duplicates} expired=${r.expired} errors=${r.errors}`,
            );
        }
    } catch (err) {
        logger.error('[scheduler] Refresh failed: ' + (err instanceof Error ? err.message : 'unknown'));
    } finally {
        running = false;
        scheduleNext();
    }
}

function scheduleNext() {
    if (refreshTimer) clearTimeout(refreshTimer);
    // Auto-refresh respects the fastest provider interval; the ingestion
    // engine still skips individual providers whose per-source interval
    // hasn't elapsed, so we never hammer the public APIs.
    const sources = getRegisteredSources();
    const min = sources.length > 0
        ? Math.min(...sources.map((s) => getSourceMinIntervalMs(s.sourceName)))
        : MIN_INTERVAL_MS;
    const interval = Math.max(min, MIN_INTERVAL_MS);
    refreshTimer = setTimeout(refresh, interval);
}

/** Start the automatic refresh loop. */
export function startRefreshScheduler() {
    if (refreshTimer) {
        logger.info('[scheduler] already running');
        return;
    }
    logger.info('[scheduler] auto-refresh started');
    scheduleNext();
}

/** Stop the automatic refresh loop. */
export function stopRefreshScheduler() {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = null;
    logger.info('[scheduler] auto-refresh stopped');
}
import type { TrailActivityReport } from './trailActivity';

/** Keep a completion visible until dismissed, including after a locked-screen
 * passage. Finished historical trips must not replay as new notifications. */
export function completionNotice(report: TrailActivityReport, activeId: string | null, dismissed: string[], now: number) {
  return report.log.find(event => event.status === 'completed' && !dismissed.includes(event.id) &&
    (event.tripId === activeId || (event.timestamp <= now && now - event.timestamp <= 5 * 60000))) ?? null;
}

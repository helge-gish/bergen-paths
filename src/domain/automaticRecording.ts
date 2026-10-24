export type RecordingPreference = 'unconfigured' | 'enabled' | 'paused';
export const AUTOMATIC_LIMIT_MS = 8 * 3600_000;
export type RecorderDependencies = {
  preference(): RecordingPreference;
  setPreference(value: RecordingPreference): void;
  active(): boolean;
  running(): Promise<boolean>;
  start(): Promise<unknown>;
  resume(): Promise<unknown>;
  finish(): Promise<unknown>;
};
/** One ordered queue for launch/resume/pause. A pause made while Android is
 * asking for permissions must win over the in-flight startup. */
export function createAutomaticRecorder(deps: RecorderDependencies) {
  let queue = Promise.resolve();
  const enqueue = (work: () => Promise<void>) => { const next = queue.catch(() => {}).then(work); queue = next; return next; };
  const ensure = () => enqueue(async () => {
    if (deps.preference() !== 'enabled') return;
    if (deps.active()) { if (!await deps.running() && deps.preference() === 'enabled') await deps.resume(); }
    else await deps.start();
    if (deps.preference() !== 'enabled') await deps.finish();
  });
  return {
    ensure,
    enable: () => {
      const before = deps.preference();
      deps.setPreference('enabled');
      return ensure().catch(error => {
        // Permission denial is not consent. A later launch must not retry it
        // automatically, and a concurrent explicit pause must still win.
        if (deps.preference() === 'enabled' && !deps.active()) deps.setPreference(before);
        throw error;
      });
    },
    pause: () => { deps.setPreference('paused'); return enqueue(async () => { await deps.finish(); }); },
  };
}

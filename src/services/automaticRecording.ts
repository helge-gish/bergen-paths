import { createAutomaticRecorder, type RecordingPreference } from '../domain/automaticRecording';
import { getStore } from '../data/native';
import { startTracking, resumeTracking, finishTracking, trackingRunning } from './tracking';
export const automaticRecorder = createAutomaticRecorder({
  preference: () => getStore().setting<RecordingPreference>('automaticRecording', 'unconfigured'),
  setPreference: value => getStore().setSetting('automaticRecording', value),
  active: () => !!getStore().active(), running: trackingRunning, resume: resumeTracking, finish: finishTracking,
  start: () => startTracking(null, getStore().setting('trailVoice', true), undefined, undefined, 'free', undefined, true),
});

import type { TourResult } from '../domain/tourMedals';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Trail, Trip } from '../domain/types';
import type { Discovery } from '../domain/discoveries';
export async function exportLog(trips: Trip[], trails: Trail[], discoveries: Discovery[], awards: Record<string, number>, tourResults: TourResult[] = []) {
  if (!await Sharing.isAvailableAsync()) throw new Error('Fildeling er ikke tilgjengelig på denne enheten.');
  const file = new File(Paths.cache, 'trakk-turlogg.json');
  file.create({ overwrite: true });
  file.write(JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), trips, trails, discoveries, awards, tourResults, sources: 'OpenStreetMap contributors, ODbL' }, null, 2));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Lagre turloggen fra Tråkk' });
}

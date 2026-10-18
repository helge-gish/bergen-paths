import type { Peak, Trip } from './types';
import { cleanPoints, distance } from './geo';
// Reference coordinates checked against OpenStreetMap on 2026-10-18. Goals use the fetched OSM nodes.
export const PEAKS: Peak[] = [
  { id: 'ulriken', name: 'Ulriken', elevation: 643, latitude: 60.3775029, longitude: 5.3869233, description: 'Høyest av de syv. Byen under deg, vidden foran deg.' },
  { id: 'floyen', name: 'Fløyen', elevation: 400, latitude: 60.3983862, longitude: 5.3454053, description: 'Byens bakhage og inngangen til et nettverk av skogsstier.' },
  { id: 'rundemanen', name: 'Rundemanen', elevation: 568, latitude: 60.4131846, longitude: 5.3665465, description: 'Vid utsikt og mange veier videre over fjellet.' },
  { id: 'sandviksfjellet', name: 'Sandviksfjellet', elevation: 417, latitude: 60.4094845, longitude: 5.3405812, description: 'Bratte bakker og utsikt over Sandviken.' },
  { id: 'lovstakken', name: 'Løvstakken', elevation: 477, latitude: 60.3607760, longitude: 5.3191415, description: 'En markant topp med byen på begge sider.' },
  { id: 'damsgardsfjellet', name: 'Damsgårdsfjellet', elevation: 317, latitude: 60.3757072, longitude: 5.2914345, description: 'En liten topp med store utsikter vest for sentrum.' },
  { id: 'lyderhorn', name: 'Lyderhorn', elevation: 396, latitude: 60.3737874, longitude: 5.2420929, description: 'Utsikt mot havet fra det vestligste av de syv fjellene.' },
];
export function visitedPeaks(trips: Trip[], peaks: Peak[] = PEAKS) {
  const visits: Record<string, { tripId: string; timestamp: number }> = {};
  for (const trip of [...trips].filter(t => t.endedAt !== null).sort((a, b) => a.startedAt - b.startedAt)) {
    const points = cleanPoints(trip.points);
    for (const peak of peaks) {
      // Require two accurate fixes separated in time, not one GPS jump.
      const nearby = points.filter(p => p.accuracy <= 25 && distance(p, peak) <= 70);
      if (!visits[peak.id] && nearby.length >= 2 && nearby.at(-1)!.timestamp - nearby[0].timestamp >= 10_000) visits[peak.id] = { tripId: trip.id, timestamp: nearby[0].timestamp };
    }
  }
  return visits;
}

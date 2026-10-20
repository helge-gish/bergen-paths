import type { Trip } from './types';
import type { tripMetrics } from './metrics';
const number = (n: number) => n.toLocaleString('nb-NO', { maximumFractionDigits: 1 });
export function journeyContext(metrics: ReturnType<typeof tripMetrics>): string {
  if (!metrics.points.length) return '';
  return `På telleren: ${number(metrics.meters / 1000)} kilometer${metrics.hasElevation ? ` og ${Math.round(metrics.ascent)} høydemeter opp` : ''}.`;
}
export function walkingCommentary(trip: Trip, metrics: ReturnType<typeof tripMetrics>, now: number): string | null {
  if (!metrics.points.length || now - metrics.points.at(-1)!.timestamp > 30000 || metrics.elapsed < 300000) return null;
  const bucket = Math.floor(metrics.elapsed / 300000);
  const openings = ['Der ja, turen ruller videre!', 'Dette er turøyeblikk å ta med seg!', 'Og vi følger turen videre fra kommentatorboksen!', 'Her kommer en oppdatering fra løypa!'];
  return `${openings[(bucket + trip.id.length) % openings.length]} ${Math.floor(metrics.elapsed / 60000)} minutter siden start. ${journeyContext(metrics)} Du velger tempoet etter terrenget.`;
}
export const celebrateStretch = (name: string) => `Der sitter den! Strekket ${name} er fullført.`;

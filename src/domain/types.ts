export type Coordinate = { latitude: number; longitude: number };
export type Fix = Coordinate & {
  timestamp: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  speed: number | null;
};
export type Trip = {
  id: string;
  name: string;
  startedAt: number;
  endedAt: number | null;
  ghostId: string | null;
  audioEnabled: boolean;
  lastCueAt: number;
  points: Fix[];
};
export type Trail = {
  id: string;
  name: string;
  tripId: string;
  createdAt: number;
  points: Fix[];
};
export type Profile = { weightKg: number | null };
export type Peak = Coordinate & { id: string; name: string; elevation: number; description: string };

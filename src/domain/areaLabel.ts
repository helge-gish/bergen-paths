import type { Coordinate } from './types';

type Address = { district?: string | null; street?: string | null; name?: string | null; city?: string | null; subregion?: string | null; region?: string | null };
export const areaLabelKey = (point: Coordinate) => `${point.latitude.toFixed(5)},${point.longitude.toFixed(5)}`;
export function addressLabel(address: Address): string | null {
  const clean = (value?: string | null) => value?.trim() || null;
  const city = clean(address.city);
  const place = clean(address.district) || clean(address.street) ||
    (address.name && !/^[\d\s.,-]+$/.test(address.name) ? clean(address.name) : null) || city || clean(address.subregion) || clean(address.region);
  return place ? city && city.toLocaleLowerCase() !== place.toLocaleLowerCase() ? `${place}, ${city}` : place : null;
}
export function areaLabelFallback(point: Coordinate | null): string {
  return point ? `${point.latitude.toFixed(3)}, ${point.longitude.toFixed(3)}` : 'Posisjon ikke valgt';
}

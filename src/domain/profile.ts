import type { Profile } from './types';
export function profileInput(weight: string, age: string, gender: Profile['gender']): Profile {
  const read = (text: string, min: number, max: number, label: string, integer = false) => {
    if (!text.trim()) return null;
    const value = Number(text.trim().replace(',', '.'));
    if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new Error(`${label} må være ${integer ? 'et helt tall' : 'et tall'} mellom ${min} og ${max}.`);
    return value;
  };
  return { weightKg: read(weight, 1, 500, 'Vekt'), age: read(age, 1, 120, 'Alder', true), gender: gender ?? null };
}

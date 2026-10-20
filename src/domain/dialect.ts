import type { Coordinate } from './types';
export type LocalDialect = 'bergen' | 'neutral';
/** Conservative Bergen-area hint. Unknown regions retain standard Norwegian. */
export function localDialect(p: Coordinate | null): LocalDialect {
  return p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && p.latitude >= 60.25 && p.latitude <= 60.52 && p.longitude >= 5.15 && p.longitude <= 5.55 ? 'bergen' : 'neutral';
}
/** Wording only; pronunciation still depends on the installed speech engine. */
export function localizeSpeech(text: string, dialect: LocalDialect): string {
  const word = (value: string, from: string, to: string) => value.replace(new RegExp(`(^|[^A-Za-zÆØÅæøå0-9_])${from}(?=$|[^A-Za-zÆØÅæøå0-9_])`, 'g'), (_, prefix: string) => prefix + to);
  let result = text;
  for (const [from, to] of [['Eg', 'Jeg'], ['eg', 'jeg'], ['No', 'Nå'], ['no', 'nå'], ['e', 'er'], ['kordan', 'hvordan']]) result = word(result, from, to);
  if (dialect === 'bergen') for (const [from, to] of [['Jeg', 'Eg'], ['jeg', 'eg'], ['Nå', 'No'], ['nå', 'no'], ['er', 'e'], ['hvordan', 'kordan']]) result = word(result, from, to);
  return result;
}

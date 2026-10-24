import type { Skin } from '../packages/herebound-sdk';
/** Platform-owned cosmetic rewards. Prices are always common Herebound credits. */
export const sharedSkins: Skin[] = [
  { id: 'herebound:fernweave', name: 'Skogvokter', description: 'Løvgrønn kappe, kobberspenner og broderier fra skogen. Din første nivåbelønning.', style: 'forest', minLevel: 2, source: 'level' },
  { id: 'herebound:stormbound', name: 'Stormvandrer', description: 'Midnattsblå kappe, sølvkanter og fjellets tegn. For deg som går videre når regnet kommer.', style: 'storm', minLevel: 2, source: 'shop', price: 8 },
];

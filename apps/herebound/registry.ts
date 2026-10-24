// The composition root is the ONLY host file that imports a concrete game.
import { createRegistry } from '../../packages/herebound-sdk';
import { ultimaX } from '../../games/ultima-x';
import { sharedItems } from '../../content/shared-items';
import { sharedSkins } from '../../content/herebound-skins';
export const registry = createRegistry([ultimaX], sharedItems, sharedSkins);

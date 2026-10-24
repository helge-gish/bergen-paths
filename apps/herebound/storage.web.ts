import type { Persistence } from '../../packages/herebound-sdk';
export const persistence: Persistence = {
  async read() { return localStorage.getItem('herebound-local-v1'); },
  async write(value) { localStorage.setItem('herebound-local-v1', value); },
};

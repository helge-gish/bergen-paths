export type MapBackground = 'topo' | 'satellite' | 'overview';
export const TOPO_TILES = 'https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png';
// Same national marked-foot-route dataset used by UT.no. WMS 1.1.1 keeps
// explicit x/y axis order. MapLibre substitutes the Web Mercator tile bbox.
export const FOOT_ROUTE_TILES = 'https://wms.geonorge.no/skwms1/wms.friluftsruter2?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=Fotrute&STYLES=&FORMAT=image/png&TRANSPARENT=TRUE&SRS=EPSG:3857&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}';
export function mapBackground(saved: unknown, satelliteAvailable: boolean): MapBackground {
  if (saved === 'topo' || saved === 'overview' || saved === 'satellite' && satelliteAvailable) return saved;
  return satelliteAvailable ? 'satellite' : 'topo';
}
export function mapStyle(background: MapBackground, publicKey = '') {
  if (background === 'satellite' && publicKey) return `https://api.maptiler.com/maps/hybrid/style.json?key=${encodeURIComponent(publicKey)}`;
  if (background === 'overview') return 'https://tiles.openfreemap.org/styles/liberty';
  return {
    version: 8 as const,
    sources: { topo: { type: 'raster' as const, tiles: [TOPO_TILES], tileSize: 256, maxzoom: 18, attribution: '© <a href="https://www.kartverket.no/">Kartverket</a>' } },
    layers: [{ id: 'topo', type: 'raster' as const, source: 'topo' }],
  };
}

#!/usr/bin/env python3
"""Fetch complete OSM ways and prepare review drafts. Never publishes a catalogue.

Uses the normal HTTPS proxy/CA configuration. A network-policy denial is fatal;
there is no mirror or proxy fallback. Run after overpass-api.de is permitted:
  python3 scripts/fetch-gatekampen-catalogues.py --output-dir /workspace/work/gatekampen-catalogues
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import urllib.parse
import urllib.request
from datetime import datetime, timezone

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output-dir', type=Path, required=True)
args = parser.parse_args()
repo = Path(__file__).resolve().parents[1]
args.output_dir.mkdir(parents=True, exist_ok=True)
endpoint = 'https://overpass-api.de/api/interpreter'


def query_osm(query):
    request = urllib.request.Request(endpoint,
        data=urllib.parse.urlencode({'data': query}).encode(),
        headers={'User-Agent': 'Gatekampen/0.1.1 (https://github.com/helge-gish/bergen-paths)',
                 'Content-Type': 'application/x-www-form-urlencoded'})
    with urllib.request.urlopen(request, timeout=75) as response:
        raw = response.read(25_000_001)
    if len(raw) > 25_000_000:
        raise ValueError('OSM response too large')
    data = json.loads(raw)
    if data.get('remark') or not isinstance(data.get('elements'), list):
        raise ValueError('OSM response incomplete; no drafts generated')
    return raw, data


# Same administrative-region selection as src/services/osm.ts. Query each
# area's centre, caching shared regions, rather than assuming a Bergen area ID.
areas = [('nordnes-v1', 60.399, 5.311), ('sandviken-v1', 60.407, 5.325), ('sentrum-v1', 60.391, 5.326)]
cache = {}
for area_id, lat, lon in areas:
    region_query = f'[out:json][timeout:30];is_in({lat:.5f},{lon:.5f})->.a;area.a[boundary=administrative][admin_level~"^(6|7|8)$"];out tags;'
    _, result = query_osm(region_query)
    regions = [e for e in result['elements'] if e.get('type') == 'area'
               and isinstance(e.get('id'), int) and e['id'] > 0
               and e.get('tags', {}).get('admin_level') in ('6', '7', '8')]
    regions.sort(key=lambda e: (-int(e['tags']['admin_level']), e['id']))
    if not regions:
        raise ValueError(f'No complete administrative area at {area_id}')
    region = regions[0]
    region_id = str(region['id'])
    raw_path = args.output_dir / f'osm-{region_id}.json'
    if region_id not in cache:
        query = f'[out:json][timeout:60];way(area:{region_id})[highway~"^(residential|living_street|pedestrian|unclassified|service|tertiary|secondary|primary)$"][name];out geom;'
        raw, _ = query_osm(query)
        raw_path.write_bytes(raw)
        manifest = {'endpoint': endpoint, 'query': query, 'region_query': region_query,
                    'region': region, 'retrieved_at': datetime.now(timezone.utc).isoformat(),
                    'sha256': hashlib.sha256(raw).hexdigest(), 'attribution': '© OpenStreetMap contributors',
                    'license': 'ODbL 1.0', 'reviewed': False}
        raw_path.with_suffix('.provenance.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False)+'\n')
        cache[region_id] = raw_path
    subprocess.run(['node', '--import', 'tsx', str(repo / 'scripts/gatekampen-catalogue.ts'),
                    '--input', str(raw_path), '--area', area_id, '--scope', region_id,
                    '--output', str(args.output_dir / f'{area_id}.draft.json')], cwd=repo, check=True)
print('Drafts only. Review street geometry, endpoints and area boundaries before publishing.')

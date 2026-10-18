import assert from 'node:assert/strict';
import { overpass } from '../src/services/osm';
import { parseOsm } from '../src/domain/discoveries';
import { parseStreets } from '../src/domain/streets';
async function main() {
const data = await overpass('[out:json][timeout:60];way(around:4000,60.406,5.329)[name~"Gutenberg|Guttenberg",i];out geom;');
console.log('OSM namesakes:', JSON.stringify(data.elements.map(e => ({id:e.id,tags:e.tags}))));
assert.ok(data.elements.length > 0, 'Expected real Gutenberg street data');
const trails = parseOsm(data,Date.now()).filter(i=>i.kind==='trail');
const streets = parseStreets(data,Date.now(),'test-Bergen');
assert.equal(trails.length,0,'Street fragments must not appear as collected trails');
assert.equal(streets.length,1,'Named pieces must form one street');
console.log(`PASS: ${data.elements.length} real Gutenberg OSM ways form one street and zero duplicate trail awards`);

}
main().catch(e => { console.error(e); process.exitCode = 1; });

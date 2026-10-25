/** Input: whole administrative-area OSM ways, never clipped geometry. */
import {readFileSync,writeFileSync} from 'node:fs';
import {gatekampenCatalogue} from '../apps/gatekampen/rules';
import {areas,areaStreets} from '../apps/gatekampen/domain';
const args=process.argv.slice(2),value=(flag:string)=>args[args.indexOf(flag)+1];
if(!['--input','--area','--scope','--output'].every(f=>args.includes(f)&&value(f)&&!value(f).startsWith('--')))throw new Error('Bruk --input hele-osm-området.json --area nordnes-v1 --scope OSM-område-ID --output catalogue.json');
const area=areas.find(a=>a.id===value('--area'));if(!area)throw new Error('Ukjent konkurranseområde.');
const raw=JSON.parse(readFileSync(value('--input'),'utf8'));if(raw.remark||!Array.isArray(raw.elements))throw new Error('OSM-svaret er ufullstendig.');
const fetchedAt=Date.now(),streets=areaStreets(gatekampenCatalogue(raw,fetchedAt,value('--scope')),area);
if(!streets.length||streets.length>2000)throw new Error('Katalogen må ha 1–2000 gater.');
writeFileSync(value('--output'),JSON.stringify({name:area.name,source_version:`${area.id}/trakk-streets-v1/${new Date(fetchedAt).toISOString()}`,streets,published_at:null},null,2)+'\n');
console.log(`${streets.length} hele gater. Kontroller kartet og gateendene før publisering. Trapper er filtrert før navnegruppering.`);

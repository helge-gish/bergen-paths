import type { GamePack } from '../../packages/herebound-sdk';

const center = { latitude: 60.39852082424811, longitude: 5.343193886616334 };
// Test entrance: Meyermarken park centre, OSM way 27461162.
// https://mapcarta.com/W27461162 — exact meeting locations still need a field check.
const testStart = { latitude: 60.40418, longitude: 5.32703 };
/** Original test story. All encounter sites are proposals, not surveyed sites. */
export const ultimaX: GamePack = {
  sdkVersion: 1, id: 'ultima-x', version: 1, title: 'ULTIMA X', subtitle: 'Lyktene under Fløyen',
  description: 'Vokteren Iver er borte. Lyktene slukner én etter én. Følg ryktene, handle med dem du møter, og finn dine egne veier inn i mysteriet.',
  areaName: 'Fløyvarden · Bergen', area: { center, radiusMeters: 5000 }, spawn: testStart,
  start: { name: 'Meyermarken', position: testStart, radiusMeters: 40 }, simulationOnly: false, currency: { name: 'gull', unitsPerCredit: 1 },
  imports: ['herebound:rowanberry'],
  helpers: [{ id: 'ultima-x:rusk', name: 'Rusk', description: 'En liten, nysgjerrig reisefølge med plass til litt ekstra i løvsekken sin.', carryGrams: 5000 }],
  items: [
    { id: 'ultima-x:keeper-light', name: 'Vokterglød', kind: 'equipment', weightGrams: 50, description: 'En liten glød fra lykten du tente ved Meyermarken. Et minne om Ivers første spor.' },
    { id: 'ultima-x:garlic', name: 'Hvitløk', weightGrams: 100, kind: 'ingredient', description: 'Et gammelt vern. Brukes sammen med rognebær for å vekke vokterlyset.' },
    { id: 'ultima-x:ginseng', name: 'Ginseng', weightGrams: 100, kind: 'ingredient', description: 'En bitter rot fra Marens forsyninger. Råvare for senere heling.' },
    { id: 'ultima-x:silk', name: 'Edderkoppsilke', weightGrams: 100, kind: 'ingredient', description: 'En nesten usynlig tråd. Råvare for senere bindingsmagi.' },
    { id: 'ultima-x:ash', name: 'Svovelaske', weightGrams: 100, kind: 'ingredient', description: 'Aske med en svak glød. Råvare for senere ildmagi.' },
    { id: 'ultima-x:moss', name: 'Blodmose', weightGrams: 100, kind: 'ingredient', description: 'Mørkerøde fibre. Råvare for senere bevegelsesmagi.' },
    { id: 'ultima-x:pearl', name: 'Svart perle', weightGrams: 100, kind: 'ingredient', description: 'En nattblank perle. Råvare for senere kraft på avstand.' },
    { id: 'ultima-x:nightshade', name: 'Nattskygge', weightGrams: 100, kind: 'ingredient', description: 'En virtuell magisk råvare, ikke en plante du skal plukke.' },
    { id: 'ultima-x:mandrake', name: 'Alrunerot', weightGrams: 100, kind: 'ingredient', description: 'En sjelden rot fra gamle fortellinger.' },
    { id: 'ultima-x:staff', name: 'Vandrestav', weightGrams: 1500, kind: 'equipment', description: 'En stav av mørkt tre. Kan samles og handles; utstyrseffekter kommer senere.' },
  ],
  encounters: [
    { id: 'rowan', name: 'Rognebær', mapLabel: 'Rognebær', visual: 'berries', rumor: 'Røde bær ved stien', kind: 'landmark', position: { latitude: testStart.latitude + .00015, longitude: testStart.longitude - .0004 }, radiusMeters: 25,
      description: 'En klase røde rognebær lyser i spillets verden. Dette er virtuelle bær du kan samle i Herebound-sekken.', greeting: 'Rusk kunne sikkert fortalt hva disse kan brukes til.', topics: [],
      interaction: { id: 'pick', label: 'Plukk 2 rognebær', costs: [], reward: { itemId: 'herebound:rowanberry', amount: 2 }, xp: 5, clue: { id: 'rowan-picked', title: 'Rognebær fra Meyermarken', text: 'Du samlet to virtuelle rognebær. De ligger i Herebound-sekken og kan brukes i spill som støtter dem.' } },
    },
    { id: 'maren', visual: 'merchant', name: 'Marens bod', rumor: 'Røyk mellom trærne', kind: 'merchant', position: testStart, radiusMeters: 40,
      description: 'Tørkede urter henger under et vokset seil. Maren løfter blikket fra en skål med mørke frø.',
      greeting: '«Du ser ut som en som ikke er redd for litt regn. Hva søker du her oppe?»',
      topics: [
        { id: 'iver', label: 'Den forsvunne vokteren', text: '«Iver var innom før lyktene sluknet. Han kjøpte ingenting. Bare spurte om noen hadde hørt sitt eget navn fra vannet.»', clue: { id: 'missing-keeper', title: 'Ivers siste besøk', text: 'Maren forteller at Iver hørte noe ved vannet før han forsvant.' } },
        { id: 'wares', label: 'Urtene dine', text: '«Knus et rognebær med hvitløk ved lykten og si: Minnet våkner. Ikke ild, men et minne som lyser.»', clue: { id: 'light-formula', title: 'Formelen: Minnet våkner', text: 'Ved lykten: ett rognebær og én hvitløk. Ordene er «Minnet våkner».' } },
        { id: 'inscription', label: 'Spør om «Husk hvem du er»', requires: 'lantern-mark', text: '«Det skrev Iver på sin første lykt. Lyset svarer på minner, ikke på befalinger. Kanskje noen fortsatt husker ham.»', clue: { id: 'memory-key', title: 'Lyset svarer på minner', text: 'Maren kjenner inskripsjonen. Et minne om Iver kan bli nøkkelen til lykten.' } },
      ],
      shop: [ { itemId: 'herebound:rowanberry', buy: 1, sell: 1, quantity: 6 }, { itemId: 'ultima-x:garlic', buy: 2, sell: 1, quantity: 8 }, { itemId: 'ultima-x:ginseng', buy: 3, sell: 1, quantity: 5 }, { itemId: 'ultima-x:silk', buy: 4, sell: 2, quantity: 3 }, { itemId: 'ultima-x:staff', buy: 8, sell: 4, quantity: 2 } ],
    },
    { id: 'rusk', visual: 'sprite', recruit: { helperId: 'ultima-x:rusk', requires: 'rusk-rumor' }, name: 'Rusk', rumor: 'Noe rører seg ved steinen', kind: 'person', position: { latitude: testStart.latitude + .00048, longitude: testStart.longitude + .0001 }, radiusMeters: 35,
      description: 'En liten skikkelse med løv i håret sitter på en flat stein. Et øye åpner seg når du nærmer deg.',
      greeting: '«Folk går så fort. De rekker aldri å høre hva steinene sier.»',
      topics: [
        { id: 'name', label: 'Hvem er du?', text: '«Rusk. Det er det de roper når de snubler i meg. Jeg liker det.»' },
        { id: 'light', label: 'De slukne lyktene', text: '«En lykt er ikke mørk bare fordi den ikke lyser. Iver la noe igjen i den gamle lykten. Jeg så det selv.»', clue: { id: 'rusk-rumor', title: 'Noe ble lagt igjen', text: 'Rusk så Iver legge noe i den gamle lykten. Det kan undersøkes uten å spørre Maren først.' } },
      ],
    },
    { id: 'lantern', visual: 'lantern', name: 'Den gamle lykten', rumor: 'Et sluknet lys', kind: 'landmark', position: { latitude: testStart.latitude - .00045, longitude: testStart.longitude + .00035 }, radiusMeters: 35,
      description: 'Glasset er helt, men innsiden er mørk. Et lite merke er skåret inn i foten.',
      greeting: 'Det kjennes som om lykten venter på noe.',
      interaction: { id: 'kindle', label: 'Tenn lykten · 1 rognebær + 1 hvitløk', requires: 'lantern-mark', costs: [{ itemId: 'herebound:rowanberry', amount: 1 }, { itemId: 'ultima-x:garlic', amount: 1 }], reward: { itemId: 'ultima-x:keeper-light', amount: 1 }, xp: 30, clue: { id: 'first-light', title: 'Den første lykten er tent', text: 'Lys strømmer gjennom glasset. Ivers stemme hvisker: «Jeg fulgte lyset oppover. Noen slukket det bak meg. Finn den som husker stien.» En liten vokterglød blir igjen i sekken din. Første del er fullført; resten av fjellet venter.' } },
      topics: [
        { id: 'mark', label: 'Undersøk merket', text: 'Under mosen står: «Husk hvem du er». Ved siden av er et bær og en hvitløk risset inn. En formel: Minnet våkner. Kanskje Maren har råvarene.', clue: { id: 'lantern-mark', title: 'Husk hvem du er', text: 'Innskriften på lykten: «Husk hvem du er». Kanskje noen kjenner ordene.' } },
        { id: 'listen', label: 'Lytt', text: 'Et kort klikk. En stemme som prøver å trenge gjennom glasset. Undersøk merket og finn råvarene som trengs for å tenne lyset.' },
      ],
    },
  ],
};

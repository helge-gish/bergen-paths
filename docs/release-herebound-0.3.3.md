# Herebound 0.3.3 – eventyrkart og synlig spiller

Installer som **Oppdater** over Herebound 0.3.2. Figur, sekk og spillprogresjon beholdes.

## Endringer

- En liten eventyrfigur med lys gullring erstatter den blå prikken. Hud, hår, kroppsvalg, skin, nivå og påkledd sekk/stav/lykt følger Herebound-figuren.
- Retningspil og synsfelt viser hvilken vei mobilen peker. Kartrotasjon trekkes fra, slik at pilen peker riktig også på et rotert kart. Figuren holdes oppreist for lesbarhet.
- «Meg» sentrerer kartet på deg. Nordknappen retter opp kartet uten å flytte utsnittet. Gamle posisjoner merkes «SIST»; ingen falsk retningspil vises når GPS eller kompass ikke er oppdatert.
- Ultima velger pergamentfarget mark, grønn skog, dempet bebyggelse, tydelige stier og lesbare gatenavn. Ukjent terreng forblir mørkt. Funn har egne små symboler for bær, sekk, lykt, person og handelsbod.
- Karttemaet er en valgfri SDK-egenskap. Andre spill kan bruke vanlig kart. Ingen Ultima-spesifikk logikk er lagt i vertens kartkomponent.
- Et nytt funn, **Rognebær ved fontenen**, gir to bær og kan samles selv om de gamle bærene allerede er plukket. Kartpunktet er et foreløpig anslag for fontenen ved inngangen til Meyermarken: 60.40418, 5.32665. Møteradius 35 meter; ligger i eksisterende startsone. Plasseringen må bekreftes ute mot fonteneområdet på brukerens satellittbilde.

Kompasset brukes bare mens feltkartet er synlig og appen er i forgrunnen. Det stoppes ved bytte til AR. Ugyldige eller over fem sekunder gamle kompassdata skjuler pilen.

## Kontroller og feltprøve

TypeScript og 351 automatiske tester bestod. De seks karttestene, inkludert en ekstra figurtest, bestod etter siste testtillegg (352 ulike tester totalt). MapLibre-stilvalidering ga ingen feil. Android-bygget og fem native AR-tester bestod. Kartfiguren er også inspisert som SVG i fire himmelretninger. Ingen tilkoblet Pixel er tilgjengelig: kompass, reell kartlasting og fonteneplassering må prøves ute.

1. Gå til fontenen ved inngangen til Meyermarken og åpne ULTIMA X.
2. Drei mobilen, roter kartet og trykk «Meg»/nord. Pilen skal følge telefonens retning.
3. Velg **Fontenebær**, åpne AR og sikt på bakken. Trykk på de små bærene eller navneskiltet når de vises.

AR beholder automatisk lokal bakkeplassering fra 0.3.2. Dette er ikke geografisk presise ankre. God belysning og detaljer i bakken hjelper kameraet.

Kartstil: modifisert OSM Liberty/OpenFreeMap med lisens og attribusjon i `apps/herebound/assets/parchment-map-LICENSE.md`. Reelle kartdata er fortsatt OpenStreetMap; spillstilen endrer presentasjonen.

Android: `no.herebound.app`, versjon 0.3.3/kode 7, arm64. Signaturen samsvarer med 0.3.2. APK-innholdet er kontrollert for karttema, retningsvisning og fontenebær.

APK: 48477970 byte. SHA-256: `314a6d67f98fcaba8120b8bc36d518d43b13e908d950a878a05fb269d08b6ff5`

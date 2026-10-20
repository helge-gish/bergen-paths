# Tråkk 0.3.12 – én oppføring for sammenhengende traseer

Turoppsummeringen kunne vise Skredderdalen mange ganger fordi hvert OSM-segment ble vist som et eget funn. Sammenhengende kartdeler med samme navn vises nå som én oppføring, også når en trasé veksler mellom sti og trapp. Samlingen bruker samme gruppering.

- Grupperingen skjer før filtrering på turstatus eller karttype. En tidligere gått eller delvis gått del mellom to nye deler deler derfor ikke opp listen. Samme trasé havner heller ikke i både «Nye funn» og «Også på denne turen».
- Kartknappen viser alle delene som separate linjer, uten å tegne forbindelser som ikke finnes i kartgrunnlaget.
- Navn normaliseres for store/små bokstaver og mellomrom. Gruppering krever felles kartkoordinater; like navn på forskjellige steder, punktmål, navnløse objekter og personlige navn holdes atskilt.
- Delvis gåtte traseer merkes med antall bekreftede deler. Haken vises først når alle kartdelene i gruppen er bekreftet. Dette gjelder de tilgjengelige kartdelene, ikke en garanti for at hele turruten er kartlagt.
- Samlingens overskrift teller steder med funn, og radene har en egen, kort kartlenke som ikke etterlater en løs pil på neste linje.

Dette er visningsgruppering. Eksisterende turspor, kartobjekt-ID-er, GPS-bevis, beregningsregler og lagrede mål beholdes. Tidligere interne poeng-/milepælberegninger er ikke endret; videre gamifisering er utenfor denne feilrettingen. Gamle turer får den nye visningen når de åpnes igjen, uten ny kartnedlasting eller datamigrering.

## Kontroll

TypeScript og 154 JavaScript-tester består. Seks nye regresjonstester dekker fem stideler pluss en trapp, komplette kartlinjer, like navn andre steder, sammenkobling uavhengig av rekkefølge, personlige/navnløse funn, delvis dekning og overlapp mellom turoppsummeringens seksjoner.

Android-APK bygges med versjonsnavn 0.3.12 og versjonskode 17. Native Android-kode er uendret fra 0.3.11. Fysisk test av visningen på telefon gjenstår.

Installer som **Oppdater**, uten å avinstallere eller tømme appdata.

# Utendørs spillarena — siste produktavklaring

**Prioritet etter siste avklaring:** Først én AR-/kartbasert RPG-testapp med ULTIMA X og et minimalt skall. Lokal figur og lagring er nok for første solofelttest. Gameplayet itereres før generell SDK, backend og MCP realiseres. [Avgrensning og gjeldende byggerekkefølge](ultima-v-world.md#førsteprioritet-test-gameplayet-før-vi-generaliserer) går foran den tidligere plattformrekkefølgen nedenfor.

**Gjeldende presisering:** [ULTIMA X, felles SDK og MCP-forfatting](ultima-v-world.md). Plattformen viser spill i nærheten; spilleren velger. Første pakke heter ULTIMA X og har 5 km radius rundt Fløyvarden. Alle spill bruker felles figur og utstyr via SDK-et. AI skal kunne opprette, validere og forhåndsvise spill via MCP før publisering. Plattformnavnet velges sammen og skal fungere internasjonalt.

24. oktober 2026. Denne beslutningen presiserer de tidligere planene: ytterst bygger vi en **game container for ekte landområder**, ikke en plattform som bare kan kjøre rollespill. Andre utviklere skal senere kunne lage spill for den. Endelig navn er ikke valgt.

## Tre lag

1. Arena: konto, spillkatalog, posisjon, ankomst, lag, kommunikasjon, lagring, områdekontroll og støttede måter å vise kart/kamera på.
2. Spilltype/regler: for eksempel rollespill, mysterium eller samarbeidsjakt. Ultima-inspirert kamp, inventar og magi er første regelsett, ikke et krav til alle fremtidige spill.
3. Spillpakke: konkret historie, sted, spillområde, figurer, gjenstander, oppgaver og uttrykk. Første pakke er ULTIMA X ved Fløyvarden.

## Områderegel

Hvert spill erklærer ett senter og en radius større enn null og **høyst 5000 meter**. Alle møteområder/utløsersoner må ligge helt innenfor denne sirkelen, også når deres egen radius tas med. Katalogens søkeavstand er noe annet enn spillets tillatte område. En spiller kan lese om et spill utenfor området, men fysisk spillankomst krever en separat sjekk.

5 km radius er en øvre grense (cirka 78,5 km²), og valgt størrelse på Fløyvarden-universet. Første testinnhold konsentreres om et lite, befart område innenfor denne grensen.

## Hva en ekstern utvikler skal kunne levere

En versjonert spillpakke med identitet, skaper, type, område, møteplasser, innhold og deklarerte funksjoner. Første format skal bruke støttede innholds-/regelblokker. Vilkårlig kode fra en skaper får ikke direkte tilgang til andres konti, inventar, rå posisjonshistorikk eller arenaens nøkler.

Utvikleren trenger lokal simulator, validering av manifest, prøvepublisering, versjonering og en dokumentert kobling til arenaens tjenester. Et verktøy som bare vi klarer å bruke er ikke ferdig som utviklerplattform.

Publiseringsflyten må kontrollere områdegrenser, faktisk tilgjengelige møtesteder, kapasitet og tillatelser der det trengs. Tekniske geofencer erstatter ikke befaring. Ingen av prototypens Fløyen-møtepunkter er publisert som godkjente.

## Varig identitet og kraft

Brukeren ønsker én figur som bygges videre og tas med inn i ulike gameplays; alle krefter og alt utstyr skal beholdes. Brukeren har sluttet seg til varig figur og fullt inventar på tvers av arenaen. Lokale spill kan gi samme evne ulike konkrete bruksområder gjennom felles begreper som lys, vern, sansing, kunnskap og påvirkning.

Et valgt aktivt utrustningssett brukes før et spill, mens alle øvrige eiendeler fortsatt finnes i inventaret. En lykt kan ha verdi både i rollespillkamp og i et mysterium. Retningen er akseptert; nøyaktig antall plasser, samvirkende egenskaper og kompatibilitetsformat må prøves med to ulike spill før detaljene låses.

## Byggerekkefølge

1. Fløyen gjennom et eksplisitt spillformat: én sammenhengende løkke med dialog, handel, oppskrift, spell/potion, taktisk kamp eller alternativ løsning, og lagret fremgang.
2. Ekte kontoer, serverlagring og samarbeidsøkt. Fløyen feltprøves med et lite lag.
3. Et lite internt spill nummer to med annen mekanikk. Skill reelt gjenbrukbare arenafunksjoner fra Fløyen-spesifikk logikk.
4. Én ekstern skaper bruker simulator, dokumentasjon og prøvepublisering. Endre grensesnittene etter den erfaringen.
5. Åpne for flere skapere og spill. Moderering, support og økonomi må ha en konkret modell før en åpen markedsplass.

## Navneretning

Navnet skal passe arenaen og ulike spilltyper. Kandidater til videre undersøkelse: Varde, Utespill og Vandr. Ingen påstand om tilgjengelig domene, varemerke eller appnavn. Lyktene under Fløyen kan være navn på første spill uavhengig av arenanavnet.

## Implementert nå

Manifest-/områdevalidering og domenemodeller ligger i `apps/arena`. Regel- og innholdsmodeller er testbare uten GPS. Ingen generell spillcontainer, creator portal, offentlig SDK eller live-server er ferdigstilt ennå.

## Slagordkandidater, 24. oktober 2026

Brukerens notat: «Games out there» og «Games out here» er mulige slagord for Herebound. Ingen variant er valgt. «Out here» peker mot spill der du selv står; «out there» mot en verden med spill å oppdage. Vurder senere om uttrykket også dekker arrangementer, tribunespill og andre stedbundne spill som ikke nødvendigvis er ute i naturen.

Oppfølgingsnotat: **GOH — Games Out Here** er også kandidat til selve container-/plattformnavnet, som alternativ til Herebound. Ikke en beslutning om navnebytte. Kort navn med mulig uttale som «go», men uttale, søkbarhet, domener og varemerketilgjengelighet må undersøkes før valg. App-ID og produktnavn beholdes foreløpig.

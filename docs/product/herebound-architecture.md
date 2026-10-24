# Herebound: arkitektur og byggerekkefølge

24. oktober 2026. Prioritert etter brukerens ønske om kart og AR som kjernen i faktisk utendørs gameplay. Arbeidet gjelder Herebound-basen og ULTIMA X. Andre spillidéer er fremtidige tester av kontrakten, ikke parallelle leveranser nå.

## Fire deler, uten å dele prosjektet opp unødvendig

| Del | Eierskap | Tillatte avhengigheter |
| --- | --- | --- |
| `packages/herebound-sdk` | Versjonert pakkekontrakt, validering, kommandoer, domeneregler og serialiserbar tilstand | Rene funksjoner/typer; ingen mobil-UI, Tråkk-importer eller ULTIMA X-importer |
| `apps/herebound` | Vert, katalog, kart/AR-paneler, brukerinput, tillatelser og adaptere for GPS/lagring | SDK og native tjenester; konkret spillimport bare i sammensetningen av katalogen |
| Ny `modules/herebound-ar` | Kameraeierskap, ARCore-sporing, lokale ankere, rendering og treff ved berøring | Android/ARCore; presentasjonsdata, ingen gull-/inventar-/historielogikk |
| `games/ultima-x` | Geografi, startsted, personer, dialog, gjenstander, egne regler innen støttede byggesteiner og grafikkreferanser | SDK-kontrakt; ingen direkte tilgang til telefon, database eller figurmutasjon |

`content/shared-items` er den eksisterende katalogen over felles gjenstander. Vi trenger ikke egne pakker for hvert lite domene nå. Del internt i SDK-et etter ansvar, og behold en tydelig offentlig inngang. Native AR kan senere få en iOS-adapter uten at spillpakken må endres.

## Dataflyt

1. Plattformens GPS-adapter leverer ferske målinger til presence-tjenesten. Spillinnhold får ikke sende inn sin egen posisjon som bevis på ankomst.
2. SDK-et kombinerer posisjon, spillpakke og lagret tilstand til tilgjengelige møter og handlinger.
3. Kart og AR leser samme scene/utvalg: stabile møte-ID-er, kartposisjon, oppdagelsesstatus, presentasjon og avstand. Kameraet har i tillegg flyktig lokal sporing.
4. Et trykk sender samme semantiske kommando fra begge visninger. SDK-et kontrollerer gjeldende tilstedeværelse, vilkår, ressurser og idempotens før en endring lagres.
5. UI bekrefter først etter varig lagring. AR-ankre, kamerabilder og renderingsrammer er ikke den autoritative spilltilstanden og skal ikke skrives til inventarlageret.

Nåværende local-test-figurer og kvitteringer beholdes. Simulatoren får en eksplisitt sesjonsmodus, fysisk test en annen; fysisk tilgang må ikke utledes fra en tidligere lagret simulatorposisjon. Begge er fortsatt uverifiserte lokale testdata inntil serverøkonomien finnes.

## Byggerekkefølge og ferdigkriterier

### 0. Behold fungerende fundament

Finnes i 0.1.1: uavhengig vert/SDK/spillpakke, lokal figur, global sekk og hjelpere, bæreevne, handel, journal, idempotente handlinger, SQLite og eksport. Videreutvikle dette; ikke skriv grunnlaget på nytt. SDK-kontrakten er foreløpig og kan migreres eksplisitt mellom prøver.

### 1. Fysisk sesjon og tilstedeværelse

Innfør tydelig modus, pålitelig posisjonskilde, startkrav, møteankomst og gjenopptak. UI får status som utenfor, nær, fremme eller usikker. Avstand kan vises med siste kjente posisjon, men stedlige handlinger krever gyldig nåværende posisjon. Håndter GPS-bortfall uten å miste fremgang.

Ferdig når samme møtetilgang kan testes med syntetiske målinger og faktisk telefon-GPS, og appomstart aldri gir belønning basert på et gammelt fix.

### 2. Ekte kart og én felles modell for visning

Gjenbruk relevant MapLibre-/kontrollerfaring fra Tråkk bak Herebounds grensesnitt. Reelle stier, egen posisjon, start og møter. Fullskjerm/minimer/sentrer. Første scene er enkel og består av møte-ID, geografisk posisjon, presentasjonsreferanse og tilgjengelige handlinger. Den lagrer ikke en kopi av figur eller inventar.

Ferdig når man kan finne Meyermarken og ett møte, se avstand/ankomst og åpne det riktige møtepanelet. ULTIMA X starter med et mørklagt spillkart som avdekkes når spilleren faktisk går. Vanlig navigasjonskart er en separat, tilgjengelig turkartvisning; å åpne det gir ingen spilloppdagelser.

### 3. Ett lokalt AR-møte

Isoler kamera/ARCore fra Tråkks treningsmodul og utvid rendereren fra retningspil til et spillobjekt som kan berøres. GPS bestemmer møtesone; et lokalt anker stabiliserer figuren på underlaget. Første versjon kan bruke eksplisitt trykk for plassering etter at underlaget er funnet. Kort og tydelig status ved dårlig sporing. Kart og AR deler valgt møte og kommandoer.

Ferdig først etter fysisk test på Pixel 6a: objektet står rimelig stabilt ved normal kamerabevegelse, trykk åpner riktig møte, kart/AR/fullskjerm/bakgrunn tåler gjentatt bruk, og kamera frigis når det ikke brukes. Ingen lovnad om geografiske centimeterankre eller delte AR-ankre i denne leveransen.

### 4. Sammenhengende ULTIMA X-feltprøve

Koble Maren, Rusk og lykten til denne løkken ved Meyermarken. Fri rekkefølge, oppdagelser, samtaler, handel og rekruttering. Belønninger tildeles én gang, også etter omstart. Test et kort forløp ute før vi utvider til det større Fløyen-eventyret.

Dette er første felt-APK-mål. Detaljert løype og sjekker: [felttestplan](herebound-field-test.md).

### 5. Magi, kamp og et løsbart mysterium

Bygg generiske transaksjoner for oppskrift/forbruk/effekt og egenskapssjekker; ULTIMA X leverer oppskrifter og konkrete effekter innen støttede regler. Legg til ett taktisk kampmøte og en alternativ løsning. AR lar spilleren finne og møte innholdet; kampen må kunne leses og styres uten fysisk løping mellom spillbrikker.

Ferdig når historien kan fullføres med meningsfulle valg og testøkonomien ikke låser spilleren. Deretter utvides opplevelsen mot ønsket 45–60 minutter.

### 6. Lastbare spillpakker og MCP-forfatterprøve

Før MCP kan lage kjørbare spill uten ny APK må den samme validerte pakkekontrakten kunne lastes som data, inkludert grafikkreferanser og erklærte kapabiliteter. Ukjente kapabiliteter avvises forståelig. Ingen vilkårlig skaperkode med direkte tilgang til appen.

MCP-verktøyene kommer rundt de virkelige funksjonene: beskriv SDK, opprett/rediger utkast, valider, simuler og lag privat publiseringsutkast. Test med et lite spill nummer to. Publiserings- og nedlastingsflyt innføres sammen med tilgangskontroll; dagens statiske registry er ikke allerede denne løsningen.

### 7. Server, konto og flerspiller

Flytt tillit til en autoritativ tjeneste før global konkurranse/økonomi: konto, eierskap, belønningsgrenser per skaper, synkronisering, lag, delte møter og bekreftet bytte. Bruk de semantiske kommandoene, stabile ID-ene og revisjonene som allerede er prøvd lokalt. Avklar migrasjon av lokale testfigurer eksplisitt.

Utseendet eies av Herebound og holdes adskilt fra styrke/ferdigheter. Før AR-figurer trenger vi en enkel presentasjonsmodell; full avatarbygger, IAP og andre kampsjangre er senere leveranser.

## Beslutning for neste arbeid

Neste kodeleveranse prioriterer en liten, sammenhengende og morsom ULTIMA X-del fra Meyermarken: mørklagt kart, faktisk gange som avdekker verdenen, stedlige AR-møter og et lite løsbart mysterium. Trinnene over er avhengigheter som bygges for denne delen, ikke et separat plattformprosjekt som må ferdigstilles først. SDK-et utvides når spillet trenger det. Se [Meyermarken-prøven](ultima-x-meyermarken.md) for det konkrete leveransemålet. Deretter vurderer brukeren om gameplayet er godt nok til videre satsing. MCP, bredt rammeverk og andre spilltyper venter.

## Andre SDK-kunde: battle royale med samme figur

Brukerens senere avklaring 24. oktober: [Meyermarken battle royale](meyermarken-battle-royale.md) blir spill nummer to som skal utfordre SDK-et. Eksisterende Herebound-figur, egenskaper, hjelpere og relevant eid utstyr skal brukes i spillet. Ingen automatisk nullstilling til identiske startfigurer.

Etter den første ULTIMA X-feltprøven kommer en liten serverstyrt flerspillerprøve før vi stabiliserer det brede MCP-/forfatterlaget. Dette endrer den tidligere rekkefølgen mellom trinn 6 og 7: battle royale trenger autoritative økter, kister, forbruk, kampstatus og resultat før den kan testes som et faktisk flerspillerspill. Den nye spillpakken skal ikke innføre en separat figur eller inventarmodell.

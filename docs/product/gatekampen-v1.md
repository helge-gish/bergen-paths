# Gatekampen — første vertikale utgave, 25. oktober 2026

## Produktbeslutninger

Egen app for å gå gater ende til ende, med varig personlig gatesamling og tidsavgrensede konkurranser. Tråkk fortsetter å være naturstier/trening. Herebound er en uavhengig spillplattform. Ingen kontoer, samtykker eller spor deles implisitt mellom appene.

Første Gatekampen teller bare gater. Trapper kan vurderes senere etter brukerens siste presisering. `gatekampenCatalogue` filtrerer highway-typer før navn grupperes, så en trapp med samme navn ikke blir del av en gate. Navngitte footways er foreløpig også utelatt, slik det tidligere Gatekampen-grunnlaget bestemte.

## Mål 1: personlig felttest — implementert i 0.1.0

- Separat Android-app `no.gatekampen.app`, separat SQLite-database.
- Kart, Samling, Kampen. Fullskjerm/minimering, tilbake til egen posisjon; trykk på gate gir navn, lengde, luftlinjeavstand, dekning og bekreftede gateender.
- Nordnes, Sandviken og Bergen sentrum har eksplisitte, foreløpige testpolygoner. Hele gater som berører polygonet er med; ingen klipping. En gate kan høre til flere områder. Grensene må gjennomgås før en faktisk konkurransesesong publiseres.
- «Hent gater der jeg er» finner det administrative gateområdet også utenfor Bergen. «Nær meg» velger hele gater nær posisjonen. Konkurranser følger ikke en spillers bevegelige sentrum.
- GPS etter eksplisitt start/tillatelser, også med låst skjerm. Pause avslutter én tur. Automatisk pause etter ti minutter bekreftet stillstand eller seks timer; brukeren starter igjen. Appåpning gjenopptar ikke en bevisst pause.
- Råspor lokalt. Avbruddsvennlig analyse omtrent hvert 15. sekund i forgrunnen, med cache av avsluttede turer. Bakgrunnen lagrer GPS/vurderer stillstand, ikke hele gatesamlingen.
- Fem tekstoppgaver: tre på Nordnes, to i Sandviken. Én aktiv jakt; løste oppgaver huskes. Ny gjennomgang etter at oppgaven åpnes kreves. Dette er ledetrådjakt, ikke ferdig fotoinnhold.

## Gjenbruk fra Tråkk

`src/domain/streets.ts` er eneste implementasjon av ende-til-ende-reglene, både lokalt og i serververifikatoren. Algoritmen og de eksisterende testene er ikke skrevet om. Se `docs/street-collection.md`: minst 95 % lengdevektet dekning på én tur, bekreftede ender, fortaustoleranse/T-kryss, adskilte komponenter, ingen kryssingspoeng, vern mot GPS-hull/fart. Separate turers deldekning summeres aldri.

Livevisning analyserer en avsluttet kopi av punktene mottatt hittil; råturen forblir aktiv. Serveren mottar bare ferdige turer. Gater utenfor konkurranseområder registreres også når regionens katalog er hentet; råspor kan analyseres senere når kartdata hentes.

## Mål 2: privat nettspill — implementert, ikke satt i drift

Supabase i Europa er anbefalt. E-postkode og OS-beskyttet tokenlagring. Private grupper, eierinvitasjoner med utløp, medlemskap, fireukerssesong og fryst gatesnapshot. Serveren beregner gater fra GPS med den delte Tråkk-algoritmen; klienten kan ikke skrive poeng. Sesong-/innmeldingsgrenser klipper GPS-beviset, ikke bare fullføringstidspunktet. Gange før sesongstart/innmelding gir ikke dekning i sesongen.

Én gate gir ett poeng per spiller/sesong. Gruppen har også felles dekning med distinkte gater. Identisk innsending er idempotent; samme tur-ID med endret innhold avvises. Deling krever egen handling. Medlemmene ser navn/antall, ikke andres posisjoner eller råspor. GPS behandles i Edge-funksjonens minne; databasen beholder kontrollsum og gatefullføringer.

Ingen driftskonto er tilkoblet. APK uten offentlig Supabase-konfigurasjon viser at vennegrupper ikke er åpnet. Ingen simulerte venner, lokale juksekontoer eller fiktive nettresultater.

## Videre rekkefølge

1. Test nær Meyermarken: hent Sandviken, start, gå kjent gate på fortauet, lås skjermen, kontroller grønn gate og ender. To halve turer skal ikke telle. Kontroller stillstandspause hjemme.
2. Koble til dedikert Supabase i Europa. Kjør SQL og Edge, publiser gjennomgåtte gateområder, test ekte e-postkode med to telefoner og en utenforstående. Bygg med offentlig prosjekt-URL/nøkkel.
3. Én vennegruppe, én sesong. Test gjentatt opplasting, dårlig nett, utløpt kode, sen innmelding og sesongslutt. Ingen fartspremier.
4. Bildejakt: egne/lisensierte stedfestede bilder og kontrollerte svar/hint. Ikke hent tilfeldige Street View-bilder uten rettigheter. Før konkurransepoeng for bildeoppgaver: skjul svar og kontroller løsningen på serveren.
5. Konto-/dataeksport og sletting, innloggingsdrift, overvåkning/backup, belastningstesting, tvister og moderering før offentlig lansering. GPS kan forfalskes; serverberegning alene er ikke juksesikkert.

## Verifikasjon

Regresjonstester for opprinnelig algoritme, sesongvinduer, områdeutvalg, trappefilter og GPS-validering. PostgreSQL-testen kjører begge migrasjonene i PGlite med testdefinert JWT-kontekst, to medlemmer og en utenforstående. Den tester SQL/RLS/transaksjoner, men erstatter ikke live Supabase Auth/Edge. Native låseskjerm/GPS og faktisk kataloghenting må bekreftes på telefon.

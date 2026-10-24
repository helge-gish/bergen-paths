# Herebound — første SDK og spillprøve

Gjeldende beslutninger 24. oktober 2026. Herebound er arbeidsnavnet på plattformen. Dette dokumentet erstatter eldre formuleringer om å lage en monolittisk spillapp og trekke ut SDK-et etterpå.

## Arkitektur og eierskap

```text
apps/herebound (vertsapp og presentasjon)
    ├── packages/herebound-sdk (kontrakt, regler og tilstand)
    └── registry.ts (kobler inn installerte spillpakker)
            └── games/ultima-x (data for første spill)
content/shared-items (felles gjenstandsdefinisjoner)
```

SDK-et importerer aldri spillpakken eller vertsappen. ULTIMA X importerer bare SDK-typer. Bare vertens `registry.ts` importerer et konkret spill. En tom registry er en gyldig Herebound-installasjon. Tråkks app-id, sporing, database og utgivelser berøres ikke. Gamle modeller under `apps/arena` beholdes som referanse; de er ikke kjernen til den nye appen.

Herebound eier figur, seks egenskaper, nivå/erfaring, gull, sekk, hjelpere, transaksjoner og lagring. Spillpakken definerer område, startsted, møter, samtaler, butikker, egne gjenstander og hjelpere. Et spill kan bare be om en SDK-handling; det får ikke skrive direkte til sekken.

### Katalog og fysisk start er to forskjellige ting

- Herebound viser spill med senter innen 5 km fra brukerens ferske posisjon. Ingen automatisk reserveposisjon i Bergen.
- Først finnes bare ULTIMA X. Det oppdages innen 5 km fra Fløyvarden: 60.39852082424811, 5.343193886616334.
- Spillpakken bestemmer startstedet. I testfasen valgte brukeren **Meyermarken i Sandviken**, cirka 60.40418, 5.32703. Første prøve bruker 40 m ankomstsone. Spillområdets senter forblir Fløyvarden. GPS-usikkerheten må ligge innenfor sonen før fysisk start kan tillates.
- Man kan lese om spillet og åpne startkoordinaten i kart før ankomst. Å finne spillet i katalogen starter det ikke.
- Etter første start er det nok å være tilbake i spillområdet for å fortsette. Møter krever fortsatt nærhet til det konkrete stedet.
- Versjon 0.1.0 bruker faktisk GPS for katalogen, men selve eventyret er en tydelig merket simulator. Møteplassene er forslag. Ingen bakgrunnssporing, kamera eller påstand om feltklar AR.

## Sekken, gjenstander og hjelpere

**Spill kan definere nye gjenstander; Herebound forvalter identitet og eierskap.** Vanlige råvarer får felles ID-er, eksempelvis `herebound:rowanberry`. Et spill importerer den ID-en når det vil bruke rognebær. Egne gjenstander får navnerom, eksempelvis `ultima-x:staff`. To identiske visningsnavn innebærer ikke samme gjenstand.

Definisjonene er versjonsbundet og kopieres inn i plattformens lagring. Sekken kan fortsatt vises selv om opprinnelsesspillet ikke er installert. Mengder og handelshistorikk lagres globalt. Journal, oppdagelser og butikklager lagres per spill. Handel i Brasil bruker de samme rognebærene som ble kjøpt i Fløyen-spillet; spillet der velger hva det kjøper, pris og senere bruksoppskrifter. Nye pakker må bruke eksisterende ID-er når de mener samme råvare.

Alle gjenstander har vekt i gram. Første balanseforsøk: bæreevne = 10 kg + 1 kg per styrkepoeng + hjelpernes bæreevne. Styrke 10 gir 20 kg; Rusk gir 5 kg til. SDK-et avviser kjøp som overskrider kapasiteten. Overlast skal aldri hindre spilleren i å gå hjem i virkeligheten, lese sekken eller selge ting. Formelen er vår testbalanse, ikke en påstand om eksakte Ultima- eller AD&D-regler.

En rekruttert hjelper tilhører Herebound-figuren og følger med mellom spill og land. Bæreevnen gjelder også når det nye spillet ikke har en spesialrolle for hjelperen. Spill kan senere tilby relevant dialog, ferdighetsbruk og oppgaver gjennom delte egenskaper. I prøven kan Rusk rekrutteres etter en samtale. Rekruttering kan ikke gi samme bæreevne flere ganger.

Felles egenskaper blir kontrollert gjennom SDK-handlinger: styrke er allerede relevant for sekk. Kommende egenskapssjekker kan bruke visdom ved spor, intelligens ved magi og karisma ved forhandling. Spill velger når en sjekk er relevant; spillpakken får ikke overskrive egenskapene. Utstyrseffekter, nivåstigning og generelle sjekker er ikke implementert ennå.

Bedre sekker, hjelperferdigheter og eventuelle kjøp vurderes etter testen. Det finnes ingen IAP i 0.1.0. Før tredjepartsspill kan utstede verdier til en delt live-økonomi, trenger Herebound serverautorisert eierskap, regler for tildeling, skaperrettigheter og vern mot duplisering. Lokale testfigurer er ikke verifiserte live-konti.

## Leveranseplan

1. **0.1.0 — sammenhengende prøve:** egen Android-app, tom katalog støttes, GPS-katalog, spilldefinert start, tydelig simulator, tre møter i fri rekkefølge, ledetråder som åpner dialog, handel, global sekk med vekt, rekrutterbar hjelper, omstart og eksport. Dette er første del av eventyret, ikke et komplett 45–60 minutters spill.
2. **Neste gameplayprøve:** blanding og bruk av magi, ressurskostnader, taktisk kamp og en alternativ løsning på lyktmysteriet. Utvid SDK-kontrakten bare med det spillet faktisk trenger. Test at Maren kan hoppes over og at siste sted kan oppdages først.
3. **Felttest på Fløyen:** befar start/møteplasser, reelt turkart, GPS-styrte møter, AR-visning med kartreserve, gjenopptak etter bakgrunn og GPS-bortfall. Ingen presis terrengfesting uten korrekt teknisk støtte.
4. **Felles konto og samarbeid:** autoritativ servertilstand, invitasjoner, handel mellom spillere og felles hendelser. Avklar økonomi og videreføring av testfigurer før delte belønninger.
5. **Forfatterprøve:** skap et annet spill med samme SDK via strukturert innhold, deretter MCP-utkast/validering/simulering/publisering. Andre spill skal ikke kreve en ny APK. Full overføring av figur, inventar og hjelpere er et testkrav.

## Varighet og integritet

`Session` serialiserer handlinger og skriver til SQLite før UI viser dem som fullført. Revisjonsnummer avviser foreldede kommandoer. Kvitteringer gjør gjentatte kommandoer idempotente. Butikkens lager, gull og sekk oppdateres samlet. Defekt eller ukjent lagreformat beholdes og kan eksporteres; det opprettes ikke en ny figur over gamle data.

SQLite-filen heter `herebound-local-v1.db`. Android-pakken er `no.herebound.app`. APK-en bruker testsignering. Eksport er tilgjengelig fra Figur & sekk; import/migrering er neste arbeid, så eksport er foreløpig til sikkerhetskopi og feilsøking.

Dette er en lokal prototype, ikke en sikker økonomiserver. Spillpakker er bundlet, gjennomgått prosjektinnhold. Valideringen er første kontraktkontroll, ikke en full publiseringssandbox for vilkårlige skapere.

## Spilltypene som skal utfordre SDK-et videre

To tankeeksperimenter fra brukeren, ikke implementerte spill:

- **Freds action-RPG på Fløyen:** lag, klasser, forsyninger, kontrollpunkter og forsvar mot fiender. Stedlige soner bruker GPS; presis sikting/kamp er en separat mekanikk. Ikke anta at GPS alene kan avgjøre skuddtreff. Første aktuelle prøve er samarbeid mot skapninger, med taktiske skjermmøter. Konkurransemodus kan senere legge til egne kampregler og balansering uten å fjerne eid utstyr.
- **Halloween i Breistølen:** privat invitasjon, kort samarbeidseventyr nær festen, spøkelser, spor, ingredienser og et felles sluttmysterium. Skaperen velger mindre område, varighet og møteplasser. Kart og vanlig møtevisning må fungere uten kamera. Dette er et egnet andre spill for å teste AI-forfatting med de samme byggesteinene.

Hold plattformens konto/figur/sekk/hjelpere/posisjon/lag adskilt fra det enkelte spillets kampregler, mål, dialog og fortelling. Utvid med versjonerte kapabiliteter når et spill trenger dem; en pakke må deklarere krav og avvises tydelig hvis verten ikke støtter dem. MCP skal produsere validert innhold og regler innen disse byggesteinene, ikke vilkårlig kode som får direkte tilgang til inventar. Dette er arkitekturretningen; 0.1-kontrakten støtter ennå bare de konkrete handlingene i prøven.

**Avatar:** Herebound eier figurens utseende og tilpasninger. Form, ansikt, hår, klær og visning av faktisk utstyr følger med mellom spill. Utseende holdes adskilt fra egenskaper og kampbalanse. Spill kan tilby egne tematiske uttrykk, forkledninger og animasjoner gjennom en felles modell. Avatarbyggeren er planlagt, ikke implementert i 0.1.0; denne utgaven viser navn, egenskaper, sekk og reisefølge.

Koordinatkilde for teststart: [Meyermarken / OpenStreetMap way 27461162](https://mapcarta.com/W27461162). Møteplassene rundt starten er simulatoreksempler, ikke befarte navigasjonsmål.

## Rettelse 0.1.1 — direkte prøvestart

«Start prøve» åpner spillet direkte ved spillpakkens startpunkt, uten GPS og uten de tidligere mellomstegene. «Fortsett prøve» bruker lagret prøveposisjon. Fysisk start i en kommende feltutgave skal fortsatt kontrolleres mot spillets startkoordinat.

Simulatorens tidsstempel og kontrollklokke oppdateres fra samme klokkeavlesning. I 0.1.0 kunne en senere avlesning i en kølagt state-oppdatering bli tolket som en fremtidig posisjon og skjule katalogen/startknappen. En ventende GPS-forespørsel kan nå avbrytes ved prøvestart og får ikke endre modus etterpå. Startdetaljer er en egen skjerm og forsvinner ikke mens GPS-tilstanden endrer seg.

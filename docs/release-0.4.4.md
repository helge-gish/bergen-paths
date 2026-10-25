# Tråkk 0.4.4 – stier, strekk og tydelig turstart

[Last ned APK](https://github.com/helge-gish/bergen-paths/raw/refs/heads/trakk-apk-0.4.4/trakk-0.4.4.apk). Installer som **Oppdater**, uten å avinstallere. Samme app-ID og testsignatur; eksisterende turer og strekk beholdes.

## Enklere bruk

- **Start tur / Avslutt tur** styrer registreringen. Appåpning starter ikke en ny tur. Kart, AR og Logg er tilgjengelige uten tur; da samles ingen nye besøk eller fullføringer. En allerede aktiv tur gjenopptar registrering ved gjenåpning.
- **Start strekk / Stopp strekk** står over kartet under turen. Avbryt kaster kladden. Avslutt tur avslutter også en ulagret kladd.
- **Trening** er tilgjengelig under tur: 4×4, japansk intervallgange og gå/jogg. Pause, fortsett eller avslutt treningen; turen fortsetter. En ny økt kan startes etterpå, og tidligere økter beholdes. Avslutt tur avslutter også treningen.
- **Finn sti/strekk** åpner AR fra Utforsk, både før og under tur. Velg et mål og «Finn starten». Avstand og retning peker mot et fast startpunkt; ankomst varsles. Dette er retning og luftlinje, ikke beregnet gangrute gjennom terrenget. «MEG» på kartet får retningspil når fersk kompassretning finnes.
- Logoen beholdes. Forklaringstekster er kortet ned; hovedmålingene ligger i Logg.

## Automatisk stihistorikk under turen

Naturstier og egne strekk gir tale ved start/fullføring og nærhet. Pågående passering vises med fremdrift og tid. Tale kan slås av i Innstillinger. Fullført natursti kan vurderes med 1–5 stjerner; navnløse stier kan få et personlig navn. Dette lagres lokalt, ikke som en offentlig kartendring.

Logg viser totale målinger, antall ulike stier/strekk fullført, antall passeringer og kronologiske besøk/fullføringer. Besøk midt på en sti gir «Vært innom», ikke ende-til-ende. Historiske, lagrede turer analyseres også; det opprettes ikke GPS-spor uten aktiv tur.

Tilknyttede, uforgrenede kartdeler med samme navn sammenføyes før analyse. Forgreninger forblir separate. Kartlagte stier er ikke nødvendigvis hele navngitte turruter. Referanser kortere enn 30 meter får foreløpig ikke ende-til-ende-tid.

GPS-hull, for upresise punkter og punkter over 6 m/s holdes utenfor gyldige passeringer, distanse og høydemeter; filtreringen lager ikke snarveier mellom brudd. Råspor beholdes. Dette er ikke aktivitetsgjenkjenning: langsom bilkjøring kan ikke pålitelig skilles fra gange. Lavere fartsgrense er notert til oppfølging.

Batterivernet lagrer og avslutter turen etter 10 minutter med pålitelig stillstand, unntatt pågående trening. Skjermen forteller at turen er avsluttet; Start tur kreves for å fortsette. Områdebytte på reise krever fortsatt godkjenning, og godkjenningen starter ikke en tur.

## Kontroll og feltprøve

326 app-/domenetester og TypeScript-kontroll består. Tester dekker blant annet eksplisitt turstart, ingen registrering ved appåpning, avvist tillatelse, trening pause/fortsett/ny økt, tale uten duplikater, lokale navn/stjerner, GPS-brudd, kjøring, sammenføying av stideler, retningspil og fast AR-startpunkt. Android-bygg og 14 native tester består. APK-kontroll bekrefter versjon 0.4.4 (kode 38), app-ID no.trakk.app, bevart logo, innebygde funksjoner og samme testsignatur som tidligere.

Ingen fysisk telefon eller emulator er tilkoblet. Test på Pixel 6a: Start tur, gå en kjent natursti fra enden og helt gjennom, kontroller tale og Logg; lag et strekk og gå det tilbake. Prøv Finn sti/strekk før tur, og trening under tur. Kontroller registrering/varsler med låst skjerm og at Avslutt tur stopper nye målinger. GPS, kompass, bakgrunnstale og batteri krever denne feltprøven.

Kildekode: `trakk-0.4.4`. APK, kildearkiv og kontrollsummer: `trakk-apk-0.4.4`.

APK: 43704734 byte. SHA-256: `df8be79a15a95259b2b5d9e3de09a60e06579a997012a315e0e1fcadf117f5fe`.

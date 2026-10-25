# Tråkk 0.4.7 – trening i Logg og to nye økter

[Last ned APK](https://github.com/helge-gish/bergen-paths/raw/refs/heads/trakk-apk-0.4.7/trakk-0.4.7.apk). Installer som **Oppdater**, uten å avinstallere.

## Endringer

«Turen er lagret» vises bare kort etter at du avslutter en tur. Bekreftelsen forsvinner når appen legges i bakgrunnen eller du starter en ny tur, og vises ikke ved neste oppstart. Start tur har ingen vedvarende statusmelding under knappen.

Logg viser treningsøkter i samme kronologiske historikk som stier og strekk. Hver økt har navn, tidspunkt, treningstid, antall drag og **Fullført** eller **Avsluttet tidlig**. Flere økter på samme tur vises hver for seg. En naturlig fullført økt kommer i Logg selv om turen fortsetter. Pågående og pausede økter merkes ikke som fullførte. Et trykk åpner turen med treningsdetaljene. Totalene viser antall fullførte treningsøkter.

Ferdigtidspunktet bevares når du senere avslutter turen eller starter en ny treningsøkt. Treningstid utelater pauser. Eldre lagrede økter beholdes; når gammel lagring mangler nøyaktig ferdigtidspunkt, brukes det tilgjengelige avslutningstidspunktet.

To nye moduser under Trening:

- **Minuttintervaller · 30 min:** 5 min rolig oppvarming, ti runder med 1 min raskt / 1 min rolig, 5 min nedtrapping.
- **Pyramide · 23 min:** 5 min rolig oppvarming, raske drag på 1–2–3–2–1 min med 1 min rolig mellom, 5 min nedtrapping.

De raske dragene kan gås eller jogges i eget tempo. Tale og vibrasjon varsler fasebytter; pause, fortsett og avslutt fungerer som i de andre modusene. 4×4, japansk intervallgange og gå/jogg beholdes. Avslutt trening lar turen fortsette.

## Bakgrunn for modusene

Minuttsintervaller og pyramider er etablerte intervallformer. Norges Skiforbunds [øktbank](https://www.skiforbundet.no/globalassets/04-gren---medier/langrenn/dokumenter/trenerklubben/17-04-nytt-fra-trenerklubben-2017-04.pdf) inneholder blant annet 10×1 min med 1 min pause og en 1–2–3–2–1-pyramide med 1–2 min pause. [SATS beskriver pyramideintervaller](https://www.sats.no/magasin/trening/kondisjonstrening/intervalltrening-loping) med varierende drag og aktiv hvile. Tråkks varianter over bruker rolig gange i pausene og en enkel, fast tidsplan; tempo velges av brukeren etter terrenget.

## Kontroll

Tester dekker fasegrenser, pauser, nye modusenes varighet, talefrister/vibrasjonssignaler til Android, flere økter på samme tur, ferdigtid ved sen turavslutning, gjenåpning av lagrede økter og fravær av gammel lagringsmelding ved appstart. 338 automatiske tester, TypeScript, Android-bygg og 14 native tester består. APK-kontrollen bekrefter versjon 0.4.7 (kode 41), app-ID no.trakk.app, nye treningsmoduser og samme testsignatur som tidligere. Tale/vibrasjon med låst skjerm må fortsatt feltprøves på mobilen.

Kildekode: `trakk-0.4.7`. APK, kildearkiv og kontrollsummer: `trakk-apk-0.4.7`.

APK: 43711382 byte. SHA-256: `d3af30300ce7ca3a424bf39d7f1c4b5b55ce41997340289d906098e48edb90e4`.

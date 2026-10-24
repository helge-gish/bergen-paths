# Tråkk 0.4.1 — flere treningsmoduser

To nye programmer under Treningsmodus, tilgjengelige når som helst:

- Japansk intervallgange: fem runder med 3 minutter rolig og 3 minutter rask gange, totalt 30 minutter. Intensitet etter egen innsats, uten fart- eller pulskrav.
- Gå/jogg: 5 minutter rolig oppvarming, seks runder med 1 minutt lett jogg og 2 minutter gange, 2 minutter rolig nedtrapping. Totalt 25 minutter.
- Eksisterende 4×4 beholder sitt 35-minutters program.

Tale, vibrasjon, faseklokke, pauser, historikk og låseskjermtekst bruker valgt program. Vibrasjon beholdes når talelyden slås av. Låseskjermteksten oppdateres også ved manuell start, pause og avslutning av trening, uten å vente på neste GPS-posisjon. Androids varslings- og låseskjerminnstillinger kan fortsatt skjule varslet; denne versjonen løser ikke den tidligere rapporterte usynlige varslingen generelt.

Å se på treningsvalgene starter ikke registrering. Hvis registrering er pauset, heter startknappen «fortsett registrering». Avslutt trening til fritt tempo, eller la programmet fullføres automatisk; GPS fortsetter. En ny økt kan startes i samme registrering, og hver økt lagres med sitt program og sin varighet. Gamle 4×4-økter beholdes uten datamigrering.

Kart og AR beholder naturstifilteret fra 0.4.0. Ingen nye gate- eller trappeforslag.

## Kontroll

249 tester for app og domeneregler består, inkludert fasegrenser, pause/gjenopptakelse, forskjellige programmer i samme GPS-registrering, varslingsdata og valg fra pauset registrering. TypeScript, Android-bygg og 14 native enhetstester består. APK-versjon, app-ID, signeringssertifikat, logo og innebygde AR-moduler er kontrollert. Ingen tilkoblet telefon eller emulator: lyd, vibrasjon og låseskjerm krever fortsatt feltprøve på Pixel 6a.

Installer APK-en som Oppdater. App-ID, lokal database og signeringssertifikat beholdes.

APK: 43542426 byte. SHA-256: `a14751c64429da6ff0c3d09f41b44d1c6d82efd843fa0d22c63893d1f7355e7e`.

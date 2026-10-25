# Tråkk 0.4.6 – enkelt å velge og avbryte

[Last ned APK](https://github.com/helge-gish/bergen-paths/raw/refs/heads/trakk-apk-0.4.6/trakk-0.4.6.apk). Installer som **Oppdater**, uten å avinstallere.

## Velg og avbryt

Trykk på en sti eller et strekk og velg **Finn starten** for AR-veivisning. **× Avbryt** ligger synlig ved valgt mål på kartet og i verktøylinjen over kameraet, også i fullskjerm og mens infopanelet er åpent. Ett trykk fjerner både valget og aktiv veivisning. Kart/kamera forblir åpent, og turregistreringen fortsetter. GPS-oppdateringer skal ikke velge det avbrutte målet på nytt.

Kartet og AR har en felles avbryt-handling i hovedappen. Kartets egen valgte markering fjernes også, inkludert mål som kom fra Logg eller AR. Den konkurrerende «Vis retning i kamera»-knappen i infopanelet er fjernet; «Finn starten» er hovedhandlingen, og «Tilbake til kamera» lar deg se deg rundt.

## Også med fra 0.4.5

- Ingen automatisk avslutning etter ti minutter i ro, og ingen slik melding. Turen fortsetter gjennom pauser; bruk Avslutt tur når du er ferdig. Eksisterende åttetimersgrense og områdesamtykke ved reise beholdes.
- Området får stedsnavn fra sitt festede sentrum, med koordinater som reserve ved manglende navn. Navnet mellomlagres.
- Logoen får «utforsk stiene nær deg».
- «Sti fullført» / «Strekk fullført» vises øverst i Utforsk og Logg. Navnløse stier får «Gi stien et navn», med navnefelt først og valgfrie stjerner. Lukkede varsler kommer ikke tilbake. Navn og vurderinger lagres personlig på mobilen og kan endres fra Logg. Talevarsler fra 0.4.4 beholdes.

## Kontroll

Tester dekker avbryt fra kamera, infopanel og fullskjerm, at kartet beholder visningen mens markeringen fjernes, ny målvalg etter avbryt og at ferske GPS-punkter ikke gjenoppretter et avbrutt mål. Alle endringene fra 0.4.5 er med. 331 automatiske tester, TypeScript, Android-bygg og 14 native tester består. APK-kontrollen bekrefter versjon 0.4.6 (kode 40), nye avbryt-handlinger, bevart logo/undertittel og samme testsignatur som tidligere.

Fysisk GPS, kompass, stedsnavn fra Android og bakgrunnstale må fortsatt prøves på telefon. AR viser retning og luftlinje til start, ikke en beregnet gangrute gjennom terrenget.

Kildekode: `trakk-0.4.6`. APK, kildearkiv og kontrollsummer: `trakk-apk-0.4.6`.

APK: 43707270 byte. SHA-256: `683fbebf9ef3a74507f2b25a35b64575e49dc5eb8b90c0559b5dc9d9ae09530e`.

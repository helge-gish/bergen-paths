# Tråkk 0.3.26 — kart og AR i Utforsk

Android testutgave, versionCode 31. Installer som oppdatering uten å avinstallere.

## Endringer

- Utforsk har «Kart / Kamera · AR» over kartet. Kameraet kan brukes både før og under en tur, uten å gå via en egen Finn sti-skjerm. Den separate Finn sti-inngangen er fjernet. Vanlig turstart er fortsatt tilgjengelig.
- Kartet beholder utsnitt, inspeksjon, historiske spor og voksende turspor ved bytte til kamera. Kameraets GPS, kompass og forhåndsvisning frigjøres ved bytte tilbake, ved fanebytte og når en annen dialog åpnes. Pågående turregistrering bruker fortsatt den separate bakgrunnstjenesten.
- Den innebygde skanneren viser stier, trapper, navngitte gater og egne strekk. Dobbelt sett med modusknapper, introduksjon og lang liste under kameraet er fjernet. Stedsvalg åpner fortsatt lesbart infopanel i fullskjerm. «Vis på kartet» bytter til kartvisningen.
- Stiinfo etter trykk på kartet har nå «Velg sti og start tur». Både kart og AR går gjennom samme startflyt med fast startpunkt, nærhetsvarsel og GPS-kontroll før turen kan starte. Manglende startpunkt gir beskjed. Under en pågående tur vises informasjon uten å tilby en ny turstart.
- Omtrentlig kompassretning viser nå stiplede callout-linjer med pilspiss, større stiplet usikkerhetssirkel og ≈-merking. Før var linjene skjult i denne modusen. God kompassretning har mindre endepunktmarkering. Gammel eller upålitelig sensor/GPS gir fortsatt ingen retningspiler.
- Logoen i toppen og fullskjerm/minimering beholdes.

## Kontroll og begrensninger

217 app-/komponenttester består, inkludert kartutsnitt og GPS-spor gjennom visningsbytter, frigjøring av skannerens GPS, start fra kart i fullskjerm, informasjon under pågående tur og omtrentlige versus gode retningshint. TypeScript-kontroll består. Skjermsimulering av omtrentlig AR-visning er visuelt kontrollert.

Android-bygg og 9 native enhetstester består. APK-ens versjon, Hermes-bundle, ny AR-visning, native kompasskode og samme signatur er kontrollert.

Dette er retningsvisning basert på GPS og kompass, med omtrentlig synsfelt. Pilene er ikke ARCore-ankere eller en presis rute tegnet på bakken. Kartdekningen avhenger av nedlastede OpenStreetMap-data og egne strekk. Fysisk Pixel 6a er ikke tilgjengelig her; kamerabytte og piler må feltprøves på telefonen.

APK: 45666896 byte. SHA-256: `f0a975fadff7b74f7faaa3ad2097cfa26e1736b7e1250ffee9c6f90ea16c67fd`.

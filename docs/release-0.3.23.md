# Tråkk 0.3.23 — AR-valg og startguide

Android testutgave, versionCode 28. Installer som oppdatering uten å avinstallere.

Et trykk på et AR-treff åpnet tidligere info langt under kameravinduet og fjernet alle andre treff. Nå åpnes et lesbart, rullbart infopanel i kamerafullskjerm med type, luftlinjeavstand, kartlagt lengde, tilgjengelige høydedata og registrert SAC-grad. Panelet tilbyr turstart, visning i hovedkartet og skygge for egne strekk. Tilbake til kamera beholder valget og andre treff. Valget kan fjernes i panelet.

- Stier, trapper og egne strekk er hovedvalgene; opptil tre nærliggende gatenavn reserveres som orienteringspunkter. Egne strekk merkes «Ditt strekk» også i kameraet.
- Retningsetiketter har mørke paneler, stiplede callout-linjer og ringer. Valgt treff fremheves, med beskjed om å snu dersom det ligger utenfor synsfeltet. Linjene markerer omtrentlig kompassretning, ikke en terrengregistrert posisjon. De skjules ved upålitelig eller gammel GPS/kompass og for treff innen GPS-usikkerheten. Nærhetslisten fungerer fortsatt uten retningsplassering.
- Kamerafullskjerm fyller tilgjengelig skjerm mellom systemfeltene. Minimer og kort status ligger over bildet. Tekniske GPS-/kompassdetaljer og nye forsøk åpnes ved trykk på statusen; ingen permanent tekstblokk under bildet.
- Turstart fra Finn sti får et fast startpunkt: opprinnelig start for lagrede strekk, nærmeste endepunkt til treffet for kartlagte deler. Kartpunktet er et forslag, ikke en bekreftet inngang til stien. Kartet viser START og brukerens posisjon. «Åpne gangvei i Google Maps» åpner ekstern gangruting til punktet; Tråkk beregner ikke en egen gangrute.
- Start krever fersk GPS (maks 15 sekunder, nøyaktighet maks 20 meter) innen 25 meter fra punktet. Både knapp og registreringstjeneste kontrollerer kravet; tjenesten henter posisjon på nytt etter tillatelsesdialogene før turen opprettes. Klokken starter først ved brukerens trykk.
- Startguiden viser «Du er ved start» og vibrerer to ganger ved ankomst mens Tråkk er åpen. Ny vibrasjon armeres først etter mer enn 45 meters avstand, så jitter ved sonegrensen ikke gjentar varselet. Bakgrunnspause nullstiller GPS-klarstatus; retur fra Google Maps krever en ny posisjon. Dette er ikke et bakgrunnsvarsel eller en geofence-tjeneste.

## Kontroll

TypeScript og 210 app-/komponenttester består, inkludert stort infopanel, beholdte treff, fullskjermstatus, callouts med gyldige sensorer, startpunktvalg, GPS-kontroll før registrering, vibrasjon og sonegrense-jitter. Android APK er bygget og kontrollert for versjon, Hermes og samme signatur som tidligere. Fysisk Pixel 6a, ekte kameraoverlegg og faktisk vibrasjon må prøves på telefonen.

APK: 45661448 byte. SHA-256: `7871daf6461ddd11b084ae0372e417920a46cb9698acf11b17fe347a8c70fa4c`.

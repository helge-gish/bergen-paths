# Tråkk 0.3.25 — alternativt AR-kompass

Android testutgave, versionCode 30. Installer som oppdatering uten å avinstallere.

Pixel 6a rapporterte fortsatt «Kompass: usikkert» utendørs. Den forrige implementasjonen krevde både Androids generelle sensorstatus på minst medium og en retningsusikkerhet på maksimalt 20 grader. Den hadde ingen alternativ beregning når rotasjonssensoren ble avvist. Den konkrete sensorverdien på brukerens telefon er ennå ikke kjent.

## Endringer

- Rotasjonssensorens oppgitte vinkelusikkerhet brukes når den finnes. Opptil 20 grader gir god retning, 20–45 grader omtrentlig retning, og større/ugyldige estimater avvises. Det generelle statusfeltet brukes når vinkelestimat mangler; minst medium gir da omtrentlig retning. Dette håndterer sensorer som gir et brukbart vinkelestimat uten tilsvarende generisk status.
- Android leser også gravitasjon og kalibrert magnetfelt, og beregner bakoverkameraets retning fra disse når rotasjonssensoren er utilstrekkelig. Akselerometer brukes dersom separat gravitasjonssensor mangler. Alternativet krever minst medium magnetisk status, plausible felt-/gravitasjonsverdier, ferske målinger og gyldig rotasjonsmatrise. Alternativet merkes alltid omtrentlig.
- God rotasjonsretning foretrekkes. Gamle eller fremtidige målinger gjenbrukes ikke; mottak av data fra én sensor gjør ikke en frosset annen sensor fersk. GPS- og helningskrav beholdes.
- Omtrentlig retning viser varme etiketter med ≈ og tydelig status, men ingen presise callout-linjer/ringer. Upålitelig kompass gir fortsatt bare nærhetslisten. Ingen retning avledes fra at man går eller fra GPS-posisjonen alene.
- «Prøv kompass igjen» er tilgjengelig ved usikker, gammel eller manglende retning, uten kameraomstart. Fullskjerm skiller nå mellom venting, utilgjengelig kompass og usikkert kompass.
- Statusdetaljene viser sensorkilde, Android-status, eventuell vinkelusikkerhet, målingens alder og magnetfeltets styrke/status. Disse opplysningene ligger bak statusknappen i fullskjerm. Ingen sensorhistorikk eller kamerabilder lagres eller sendes.

## Kontroll

215 app-/komponenttester består. Nye Android-enhetstester dekker vinkelestimat kontra generisk status, magnetiske kvalitetsgrenser, alternativ sensor, utløpte målinger og kameraretning. Komponenttesten dekker omtrentlig visning uten callout-ankere, god visning med ankere, foreldede målinger og separat kompassomstart. Android-bygg og 9 native enhetstester består. Ny kompasskode er verifisert i APK-ens DEX-filer, i tillegg til versjon, Hermes og samme signatur.

Fysisk Pixel 6a er ikke tilgjengelig her. Endringen må feltprøves; den garanterer ikke retning ved reell magnetisk forstyrrelse eller manglende kalibrering.

APK: 45665124 byte. SHA-256: `08ff21660f26b8c7d1e5d80747d3b2a9d583991ae3c91a3e185f07b836f4da65`.

# Tråkk

En Android-først tur-app for registrering, utforsking og samling, bygget med Expo, React Native og TypeScript. Turene er ikke begrenset til et bestemt sted.

## Første versjon

- Registrerer GPS-spor, distanse, fart, høydeprofil og filtrerte høydemeter opp/ned.
- Måler hele tiden fra start til slutt. Pauser trekkes aldri fra. Starttid og GPS-punkter lagres fortløpende i SQLite.
- Har «Lagre sti hit» under vanlig tur, med automatisk start ved forrige klipp og valgfritt navn. Skyggeturer har ingen klippeverktøy. Se [turmodusene](docs/trip-modes.md).
- Åpner lagrede stier fra Utforsk og kompasset, med direkte oppstart av stien som skygge.
- Tilpasser kartet til hele den lagrede turen og lar deg slette turen med bekreftelse.
- Lar deg navngi hele eller deler av et lagret turspor. Egne stier vises på kartet og i et kompass med luftlinjeavstand.
- Viser en skygge av en tidligere tur, med den opprinnelige tidslinjen og pausene. Valgfrie norske stemmemeldinger gir tidsavvik omtrent hvert minutt når sammenligningen er pålitelig.
- Oppdager vedvarende ruteavvik og gjeninntreden på referanseruten. Avstikkere og GPS-hull gjør hele turens tidsresultat usammenlignbart; det gis ingen snarvei-rekord.
- Samler navngitte gater i kartlagte lokale områder ved minst 95 % lengdedekning og alle ender i én sammenhengende, lagret gåtur. Hele gaten med forgreninger vises på kartet. Se [reglene for gatesamling](docs/street-collection.md).
- Har et turpass for OSM-stier, topper, utsiktspunkter, hytter/ly, landemerker, kilder og rasteplasser. Stidekning kan samles over flere turer. Oppnådde stempler lagres lokalt; gatestempler vurderes på nytt ved kartoppdatering.
- Henter kartobjekter automatisk langs lagrede turer mens appen er åpen, med mellomlagring og nye forsøk ved nettfeil. Alle kategorier teller på både vanlige turer og skyggeturer.
- Følger posisjonen din automatisk med valgt radius, og har målforslag fra OSM og aktiverbare personlige mål med fast innhold.
- Har en Tråkkvenn med mann/dame, animasjon og synlig opptjent utstyr fra distanse-, stignings- og samlingsmilepæler. Se [mål og sosial pilot](docs/goals-and-social.md).
- Lagrer turlogg og valgfri vekt lokalt, og eksporterer turer og samling som en JSON-fil uten vekten.

Dette er en første implementasjon. GPS med låst skjerm, tale i bakgrunnen, faktisk batteriforbruk, kartvisning og sensorpresisjon må kontrolleres på en fysisk Android-telefon før appen kan regnes som pålitelig på tur. Retningsbasert kamera-AR finnes i Android-testutgaven; den krever feltprøving. Ingen konto, skysynk, sosial deling eller planteidentifikasjon er implementert.

## Utvikling

Testet JavaScript-miljø: Node 24, npm 11. Appen er låst til **Expo SDK 55 / React Native 0.83**, som bruker tilgjengelig Android SDK 36. SDK 58-utgangspunktet krevde Android SDK 37, som ikke var tilgjengelig i det kontrollerte SDK-repositoriet.

```bash
cd /workspace/bergen-paths
export npm_config_cache=/workspace/.npm-cache
export XDG_CACHE_HOME=/workspace/.cache
npm ci
npm run typecheck
npm test
EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 npm run export
```

Eksport bygger JavaScript/Hermes-pakker for Android og iOS. Den lager ikke en APK/IPA og bekrefter ikke native funksjonalitet.

Appen trenger en **egen native build**. Expo Go inneholder ikke MapLibre-modulen og er ikke tilstrekkelig for bakgrunns-GPS.

Med Android SDK, Java og en tilkoblet telefon/emulator:

```bash
npm run android
```

I dette skymiljøet ligger JDK 17 under `/workspace/.java` og Android SDK 36 under `/workspace/.android-sdk`, med NDK 27.1.12297006 og CMake 3.22.1. En selvstendig ARM64-testpakke med innebygd JavaScript kan bygges slik:

```bash
python3 scripts/build-android.py
```

Resultatet er `android/app/build/outputs/apk/release/app-release.apk`. Skriptet bruker testnøkkelen fra det genererte prosjektet; dette er ikke en produksjonssignert butikkutgivelse. Pakken trenger ikke Metro for å starte. Native bygging og fysisk felttest er separate kontroller.

**Android-testversjon:** [Tråkk 0.3.22](https://github.com/helge-gish/bergen-paths/releases/tag/trakk-0.3.22). AR beholder kompasset ved varierende GPS, viser tydelig klar-status og gir nærhetshint for stier og navngitte gater. Installer som oppdatering for å beholde turene. Se [endringer og kontroll](docs/release-0.3.22.md).

Versjon 0.1.0 manglet `RECEIVE_BOOT_COMPLETED`, som Android krever når `expo-task-manager` oppretter vedvarende GPS-jobber. Det ga et native krasj ved første posisjonsoppdatering og kunne gjenta seg ved gjenåpning. Tillatelsen er nå eksplisitt deklarert i `app.json`, og byggeskriptet kontrollerer den ferdige APK-en for å hindre samme feil igjen.

Automatisk prøve på tilkoblet Android-emulator (APK-en må finnes under `android/app/build/outputs/apk/release/`):

```sh
python3 scripts/android-smoke.py
```

Prøven starter en tur, sender GPS-punkter, kontrollerer forgrunnstjenesten, låser skjermen, gjenåpner en aktiv tur og avslutter den. `TRAKK_SMOKE_FIRST_RUN=1` prøver også overgangen tilbake fra Androids bakgrunnstillatelser. `python3 scripts/android-goals-smoke.py` tester i tillegg stier, sletting, skyggeturer, mål, hjemmeområde og avatar på en disponibel emulator. Prøven er kun for en emulator; den installerer en testpakke og endrer tillatelser.

For en allerede installert development build:

```bash
npm start
```

Telefonen må kunne nå Metro fra maskinen som kjører serveren. En localhost-adresse i skymiljøet er ikke tilgjengelig direkte fra telefonen. Det er ikke satt opp noen tunnel eller EAS-konto her.

Native mapper genereres fra `app.json` og er ignorert av Git. `npx expo prebuild --platform android --no-install` genererer Android-prosjektet. Tilgangen til nøyaktig posisjon og bakgrunnsposisjon konfigureres av Expo-pluginen. Kartet bruker MapLibre og trenger ikke Google Maps-nøkkel.

## Nettverk og datakilder

- `registry.npmjs.org`: pakker under installasjon.
- `tiles.openfreemap.org`: kartstil, kartfliser og kartressurser.
- `overpass-api.de`: OSM-objekter ved eksplisitt henting i turpasset.
- `www.openstreetmap.org`: kildehenvisninger som åpnes i nettleseren.
- Android-bygg trenger Google Android/Maven- og Gradle-repositoriene i tillegg.
- `repo.reactnative.dev`: React Natives native Android-pakker etter omdirigering fra Maven.

Kart/OSM-domenene er lagt til i skymiljøets konfigurasjonsutkast. Den nåværende proxyen svarte 403 ved kontroll; lagring av utkastet alene aktiverer ikke nettverksendringene. Kart og Overpass er derfor ikke funksjonstestet mot nett i denne instansen ennå.

Kart: OpenFreeMap og © OpenStreetMap-bidragsytere, ODbL. OSM-identitet og kildelenke bevares for hvert objekt. Kartnedlasting deler søkeområde/visningsområde med disse tjenestene, men laster ikke opp turhistorikken. Privat/forbudt adgang filtreres når den er merket i kartdata. Åpningstider og adgang kan ikke utledes sikkert fra en kartmarkør.

De syv byfjellene har et kuratert startutvalg for kartnavigasjon; fjellstempler bruker navnematchede, nedlastede OSM-toppkoordinater. Utvalgets startkoordinater er ikke navigasjonsfasit. Innsjøflater er ikke automatisk samlepunkter i denne versjonen: en flates sentrum kan ligge utilgjengelig ute i vannet.

## Målinger og sammenligninger

- Tid er basert på lagret start- og slutt-tidsstempel, også gjennom appavbrudd. Telefonklokken må være korrekt; denne prototypen har ingen egen kalibrert monotontidskilde på tvers av omstarter.
- Unøyaktige GPS-punkter og urimelige hopp filtreres. Lange GPS-hull forbindes ikke med oppdiktede rette stier. Dette kan gi for lav distanse og høydegevinst når dekningen er dårlig.
- Høydemeter bruker GPS-høyde med nøyaktighetskrav, medianfilter og hysterese. Det er ikke barometer- eller terrengmodellkorrigert.
- Skyggen krever samme startområde og sammenlignbar fremdrift. Kryssende/løkkede ruter kan gi «usikkert» i stedet for et falskt tidsavvik. Deteksjon av nytt sporparti er et avvik fra referansen, ikke bevis på en tidligere ukjent sti.
- Stier samles ved minst 85 % beregnet dekning med nøyaktige GPS-segmenter innen 15 meter. Nærliggende parallelle stier kan fortsatt forveksles. OSM-ways er kartsegmenter, ikke nødvendigvis hele navngitte stier.
- Turmål krever to nøyaktige punkter over minst 10 sekunder innen 40 meter. De syv fjellenes spesialsamling bruker 70 meter.
- Energi er et grovt, MET-basert spenn for gange, avhengig av vekt og hastighetsområder. Stillstand inngår med hvileforbruk. Utilstrekkelig dekning, løpehastighet eller manglende vekt gir intet estimat. Spennet er ikke et statistisk konfidensintervall og kan bomme ved bratt terreng eller tung sekk. Alder/høyde samles ikke inn siden de ikke gir grunnlag for et presist estimat alene.

## Første test på telefon

1. Installer en native build. Åpne kartet og hent OSM-samlingen. Kontroller plasseringer og kildehenvisninger.
2. Start en kort tur med nøyaktig posisjon og bakgrunnstilgang. Kontroller at Android viser registreringstjenesten.
3. Lås skjermen, gå noen minutter, stå stille et minutt og fortsett. Avslutt turen. Sjekk at total tid inkluderer stoppet, at kartsporet stemmer og at høydedata er rimelige.
4. Åpne appen på nytt. Kontroller at turen er bevart. Navngi en del av sporet og finn den med kompasset.
5. Velg turen som skygge, prøv stemmen, og gå samme rute igjen. Sjekk lyd med skjermen låst og med hodetelefoner. Norsk tekst-til-tale-stemme må være tilgjengelig på telefonen.
6. Gå en tydelig avstikker og tilbake. Kontroller at appen markerer avviket og ikke påstår direkte tidsrekord.
7. Gjenta med midlertidig dårlig GPS og strømsparing. Ingen manglende punkter skal skjules. Tvangslukking og omstart kan stoppe tjenesten; fortsett-knappen må bevare starttiden.
8. Kontroller OSM-stempler, delvis stidekning over flere turer og JSON-eksport. Test også avvist tillatelse og utilgjengelig nett.

## Videre

Plantearter som egen samling med usikker identifikasjon og bildedokumentasjon; flere lokale samlinger; offlinekart; innlogging/synk; sosiale forbindelser og bergenske reaksjoner; kameraoverlegg for fjell og stier. Før dette prioriteres felttest av målingene og bakgrunnsdriften.

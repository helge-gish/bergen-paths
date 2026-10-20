# Tråkk 0.3.15 — kamera, kart og aktivt startmerke

Android testutgave, versionCode 20. Installer som oppdatering, uten å avinstallere.

## Kamera · AR

0.3.14 viste en tom mørk kameraflate på Pixel 6a selv etter godkjent kameratilgang. Også siktekors og statustekst manglet. Feilen er ikke gjenskapt på fysisk telefon i byggmiljøet, så endringene må bekreftes på brukerens Pixel 6a.

- Kameraets vindu bruker eksplisitt maskinvareakselerasjon. Finn sti beholder native underliggende visninger ved rulling.
- Expo Cameras CameraX-forhåndsvisning bruker `COMPATIBLE`/TextureView for å komponeres sammen med klipping og AR-overlegg. Autolinking bygger `expo-camera` fra kildekode, slik at Expo sin ferdigbygde AAR ikke omgår rettingen. En versjonskontrollert, idempotent patch kjøres ved installasjon og Android-bygg. Ukjent oppstrømskode stopper byggingen fremfor å hoppe over rettingen.
- Kameraet får målte, eksplisitte dimensjoner. Overlegget har en egen native beholder og tydelig tegnerekkefølge.
- Status står utenfor kameraflaten. Oppstart uten svar gir beskjed etter ti sekunder. «Prøv kamera igjen» oppretter en ny kamerasesjon, også om native oppstart ikke rapporterer feil.
- «Fullskjerm» og «Minimer» bytter størrelse. Bare én kamerasesjon er montert av gangen; valgt sti beholdes i Finn sti.
- Kameraet frigjøres i bakgrunnen og når visningen lukkes. Ingen mikrofontillatelse eller opptak er lagt til.

## Kart

Stier vises alltid. «Stier»-bryteren er fjernet. «Turkart»-knappen vises ikke når det bare finnes én tilgjengelig karttype. Fullskjerm/minimering og posisjonsknappen beholdes. Satellitt krever fortsatt en MapTiler-nøkkel og er ikke aktivert i denne APK-en.

## Ett aktivt startmerke

- En fast badge over bunnmenyen viser turens aktive startmerke, hvor lenge siden det ble satt, og et nærliggende navn eller omtrentlig avstand/retning.
- Turstart er standardmerket, også før første brukbare GPS-punkt. Ukjent plassering vises som «Venter på første GPS-punkt».
- Trykk på badgen for kart ved merket. Hovedkartet viser ett aktivt startmerke; den ekstra «Sist lagret»-markøren er fjernet fra den aktive turvisningen.
- «Sett nytt startmerke her» erstatter merket etter bekreftelse. Oversikten åpnes ved det nye merket. Hele tursporet beholdes.
- «Lagre strekk hit» lagrer fra merket til siste ferske GPS-punkt. Sluttpunktet blir neste aktive startmerke. Angre gjenoppretter forrige merke.
- Merket bygger på den eksisterende lagrede strekkstarten og overlever gjenåpning. På skyggetur vises turstart; markering av nye strekk følger fortsatt regelen om vanlig tur.
- Stedsnavn beregnes bare når merkets koordinat eller kartdata endres. Avstand og retning skjules ved gammel GPS.

## Kontroller

181 JavaScript-/komponenttester og TypeScript-kontrollen består. De nye testene kjører den faktiske React-kamerakomponenten med mockede native grenser og sjekker målt kameraflate, oppstart, timeout, nytt forsøk, bakgrunn/forgrunn, nektet tilgang, feil og fullskjerm/minimering. De erstatter ikke en test av telefonens kamerabilde.

Startmerket testes fra turstart uten GPS, gjennom flytting, videre gange, lagring, ny databaseinstans og angre. Android-bygget og seks native tester består. Ferdig APK er kontrollert for versjon, Hermes, forventede UI-tekster, samme signeringssertifikat som forrige utgave og fravær av mikrofontillatelse. DEX-koden i APK-en inneholder `COMPATIBLE` og `setImplementationMode` i `ExpoCameraView`; rettingen er dermed med i den distribuerte kameramodulen. Byggskriptet kontrollerer også kompilert kamerakode.

APK: 45987480 byte. SHA-256: `7e30ac33ce08bf3b51db54de8fa916605aefc82f68db5b7ab07865b5083d8834`.

Teknisk grunnlag: [Android CameraX preview](https://developer.android.com/media/camera/camerax/preview), [React Native Modal](https://reactnative.dev/docs/modal), [ScrollView og klipping](https://reactnative.dev/docs/scrollview#removeclippedsubviews).

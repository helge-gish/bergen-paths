# Gatekampen 0.1.2 — retting av GPS-oppstart

Installer som **Oppdater** over 0.1.0 eller 0.1.1. Ikke avinstaller eller slett appdata. App-ID, signeringsnøkkel og databasen med registrerte turer er beholdt.

## Endret

- Venter på at Gatekampen er i forgrunnen etter tillatelsesvinduene før GPS-tjenesten starter.
- Håndterer Androids avvisning av oppstart, forsinket tjenestebinding og manglende varslingsoppsett uten å kaste et ufanget unntak på hovedtråden.
- Beskytter mot asynkront avvist oppslag av siste posisjon og null-intent ved tjenesteoppstart.
- Rydder én gang bort en gammel registrering fra 0.1.0/0.1.1. Turen og punktene beholdes. Velg **Fortsett registrering** hvis en tur ble avbrutt.
- En mislykket gjenopptakelse avslutter ikke den lagrede turen. En tur eldre enn seks timer lukkes før en ny registrering starter.

## Verifikasjon

353 automatiserte app-tester og TypeScript bestod. Den utvidede oppgraderings-/gjenopprettingstesten bestod etter siste endring. Fire native Android-tester (Robolectric) bestod. APK-en er kontrollert: `no.gatekampen.app`, versjon `0.1.2`, kode `3`, arm64, samme signeringssertifikat som den publiserte 0.1.0-APK-en. De rettede native feilbanene er verifisert i APK-ens DEX, og oppgraderingshåndteringen er med i JS-bundelen. Kamera og mikrofon er ikke med.

APK SHA-256: `6e4b2ecfcf5d0a9717127877d93b1b483695432890550c3a536ddf524d0ad401`.

Android-testene simulerer blant annet avvist foreground service etter asynkron binding. De erstatter ikke en fysisk Pixel 6a-test. Vi har ikke telefonens krasjlogg; feilbanene som er rettet samsvarer med rapporten, men den konkrete årsaken på telefonen er ikke bekreftet.

Prøv først å åpne oppdateringen, fortsett/start registrering, lås skjermen i ett minutt og åpne appen igjen. Kontroller at GPS-varselet vises og at appen forblir åpen. Prøv deretter Pause og ny registrering.

Vennegrupper og e-postoppsett har fortsatt begrensningene beskrevet i [0.1.1](https://github.com/helge-gish/bergen-paths/blob/gatekampen-0.1.2/docs/release-gatekampen-0.1.1.md). Denne oppdateringen gjelder lokal GPS-registrering.

## Teknisk

Bygg: `GATEKAMPEN_ANDROID_CHECKS=1 python3 scripts/build-gatekampen.py`.

Gatekampen bygger Expo Location 55.1.14 fra kilde med en versjonskontrollert retting i `scripts/patch-location-service.cjs`. En vanlig foreground-start (`startService`) etterfulgt av kontrollert promotering unngår å armere Androids fatale foreground-service-tidsfrist før den asynkrone bindingen er ferdig. Feil rydder binding/tjeneste og rapporteres til JS. Rettelsen bygger på de berørte kodebanene i [expo/expo#49424](https://github.com/expo/expo/issues/49424), [#24834](https://github.com/expo/expo/issues/24834) og [#51389](https://github.com/expo/expo/issues/51389).

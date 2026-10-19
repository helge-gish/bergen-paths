# Tråkk 0.3.10

Rapportert feil i 0.3.9: klokken oppdaterte omtrent hvert 50. sekund under en vanlig tur, og knappene kunne bruke flere minutter på å svare. Denne utgaven er laget på nytt fra GitHub-taggen `trakk-0.3.9`; den upubliserte utgaven fra det tidligere arbeidsmiljøet var ikke tilgjengelig.

## Rettelser

- Strekkmatching bruker nedre grenser for avstand og fremdrift til å begrense hvilke sporsegmenter som må projiseres. Samme retning, pauser, vendinger, GPS-opphold og tidligere rekordgrenser beholdes.
- Databasen gjenbruker uendrede turer og lagrede strekk. Nye punkter, også forsinkede leveranser, og endrede innstillinger gir oppdaterte øyeblikksbilder.
- Distanse, høyde og kartgeometri beregnes fra GPS-sporet når det endres. Klokken, snittfarten og visningen av foreldet GPS oppdateres fortsatt med tiden.
- Kartet gjenbruker uendrede inndata. Bakgrunnsregistreringen beholder rå GPS-data, men kjører ikke strekk-/skyggesammenligning for leveranser som bare inneholder unøyaktige eller ugyldige punkter.
- Byggeskriptet gir også Gradle-wrapperens oppstarts-JVM miljøets proxy og CA-lager.

## Validering

- TypeScript-kontrollen og alle 141 tester består, inkludert fem nye regresjonstester for lange strekk, klokken ved GPS-opphold, fremtidige tidsstempler og uendrede/endrede databaseøyeblikksbilder.
- En syntetisk sammenligning med 4 000 GPS-punkter gikk fra omtrent 2 877 ms i 0.3.9 til omtrent 32 ms i dette miljøet. Dette er en lokal måling, ikke en garanti for en bestemt telefon.
- 1 000 deterministiske sammenligninger med GPS-drift, løkker og avstikkere ga samme strekkresultater som 0.3.9.
- Android-releasebygget fullførte alle 655 oppgaver. Den ferdige APK-en er kontrollert for pakkenavn, versjonskode, ARM64-arkitektur, innebygd Hermes-kode og nødvendige tillatelser. APK-signaturen er identisk med GitHub-utgivelsen 0.3.9.
- Fysisk Android-felttest gjenstår. Denne instansen har ingen tilkoblet Android-enhet eller emulator.

Pakken er en ARM64-testversjon med innebygd JavaScript, pakkenavn `no.trakk.app`, versjon `0.3.10` og Android-versjonskode `15`. Installer over 0.3.9 som **Oppdater**, uten å avinstallere eller tømme data. Test klokken, knapper og lagring på en kort vanlig tur, også med dårlig GPS, før en lengre tur.

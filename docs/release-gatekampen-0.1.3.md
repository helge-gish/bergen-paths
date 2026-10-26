# Gatekampen 0.1.3 — feilsøkingsutgave

0.1.2 løste ikke oppstartskrasjen på brukerens Pixel 6a. Denne utgaven skal hente den konkrete feilen og gjør gjenoppretting tilgjengelig før hovedappen starter. Årsaken på telefonen er fortsatt ikke bekreftet.

Installer som **Oppdater**, uten å avinstallere eller slette appdata.

1. Åpne Gatekampen og trykk **Åpne Gatekampen** på feilsøkingsskjermen.
2. Hvis appen åpner normalt, prøv **Start/Fortsett registrering**.
3. Hvis den lukker seg, åpne den igjen. Velg **Kopier feilrapport** og lim rapporten inn i samtalen.

## Endret

- En Android-skjerm i egen `:diagnostics`-prosess kan vise feil uten å starte React Native, kart eller GPS. Normal åpning går videre til appen når det ikke er en ny feilrapport.
- Java/Kotlin-unntak lagres lokalt før Androids vanlige krasjhåndtering. Androids egen informasjon om siste krasj vises også der den er tilgjengelig.
- Feilrapporten inneholder appversjon, mobilmodell, Android-versjon og feilstakk. Den leser ikke turdatabasen eller innloggingslagringen, og lastes ikke opp. Brukeren velger selv å kopiere den.
- Den gamle lagrede GPS-jobben ryddes én gang **før Expo initialiseres**. Ryddingen i 0.1.2 skjedde først fra JavaScript og kunne ikke beskytte mot en feil tidligere i oppstarten. Turdatabasen og andre jobber beholdes.

Dette er ikke en fysisk verifisering på Pixel 6a. Native krasj uten Java-unntak kan gi mindre detaljer i Androids feilrapport; videre diagnose kan da kreve en systemlogg.

## Verifikasjon

TypeScript og ni native Android-tester (Robolectric) bestod: fire for GPS-tjenesten, fire for krasjrapport/gjenoppretting og én mot det genererte manifestet for å verifisere at det eksisterende appikonet peker til den isolerte feilsøkingsprosessen. APK-en er kontrollert for app-ID `no.gatekampen.app`, versjon `0.1.3`, kode `4`, arm64 og samme sertifikat som 0.1.0. Feilsøkingsklassene og startikonets alias er verifisert i APK-en.

APK SHA-256: `a5ad6920d906aeafeb65a564357f464a4a47505698622c463c4a0f0f73e58d92`.

Bygg: `GATEKAMPEN_ANDROID_CHECKS=1 python3 scripts/build-gatekampen.py`.

Native kilde ligger i `apps/gatekampen/native/GatekampenDiagnostics.kt`. Byggeskriptet installerer denne og manifest-/Application-endringene etter Expo prebuild med `scripts/patch-gatekampen-startup.cjs`.

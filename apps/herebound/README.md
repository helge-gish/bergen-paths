# Herebound 0.1.1

Selvstendig Expo-app og vert for deklarative spillpakker. ULTIMA X er første innholdsleverandør, ikke en del av Herebounds motor. Fungerer med tom spillkatalog.

Fra repository-roten:

```sh
npm ci
npm run typecheck
npx tsx --test tests/herebound.test.ts
python3 scripts/build-herebound.py
```

Bygget krever Java 17 og Android SDK 36. Scriptet bruker samme kontrollerte Gradle/proxy-oppsett som Tråkk, men genererer sitt eget native prosjekt under `apps/herebound/android`. Ingen endring av Tråkk eller eksisterende brukerdata.

APK: `apps/herebound/android/app/build/outputs/apk/release/app-release.apk`.

Prøv: opprett figur → Start prøve. Neste gang brukes Fortsett prøve. Velg et rykte, flytt dit og undersøk. Handle hos Maren; undersøk lykten først om du vil; snakk med og rekrutter Rusk. Åpne Figur & sekk. Lukk og åpne appen for å kontrollere videreføring.

GPS brukes bare til å finne spillkatalogen. Spillprøven bruker simulert posisjon. Kartet i selve prøven er skjematisk og skal ikke brukes til navigasjon. Magi, kamp, komplett historie, AR og flerspiller er neste leveranser.

[Arkitektur, beslutninger og leveranseplan](../../docs/product/herebound-sdk.md).

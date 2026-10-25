# Gatekampen 0.1.0

Egen Android-app for gater. Kart, personlig samling, fem ledetrådoppgaver og bakgrunnsregistrering. Trapper er utelatt, men kan vurderes senere. Ende-til-ende er direkte gjenbruk av Tråkks testede algoritme.

[Produktplan](../../docs/product/gatekampen-v1.md).

## Kjør og bygg

Fra repo-roten: `npm ci`, `npm run typecheck`, `npm test`.
Fra appmappen: `npx expo start`. Krever native development build, ikke Expo Go.
APK: `python3 scripts/build-gatekampen.py` fra repo-roten. Krever Java 17 og Android SDK 36. Standard arm64 passer Pixel 6a. Behold signeringsnøkkelen i generert Android-prosjekt for senere oppdateringer; dette er testsignering.

## Koble til vennegrupper

Database og GPS-verifikator er satt i drift 25. oktober 2026 i Gatekampen-prosjektet i Frankfurt. Se `backend/deployment.json`. Første APK (0.1.0) er fortsatt lokal; neste APK venter på e-postoppsett og publiserte konkurranseområder. `publicConfig.ts` inneholder kun prosjektets offentlige klientnøkkel. Ingen falske kontoer eller resultater.

**Ikke kjør bootstrap-SQL på nytt i det tilkoblede prosjektet.** De følgende stegene beskriver oppsett av et nytt prosjekt.

1. Opprett eget Supabase-prosjekt i Europa. Aktiver e-post-OTP med mailmal som inkluderer `{{ .Token }}`. Konfigurer e-postlevering/rate limits.
2. Kjør `schema.sql`, deretter `backend/002_competitions.sql`, i tom database. Ikke Tråkk/Herebound-databasen.
3. Fra repo-roten: `node scripts/bundle-gatekampen-verifier.cjs`. Genererer `backend/supabase/functions/gatekampen-verify/index.ts` fra den delte Tråkk-algoritmen. Generert fil er ignorert i Git.
4. Fra `backend`: `supabase functions deploy gatekampen-verify --project-ref <prosjekt>`. Funksjonen validerer brukerens token gjennom Auth. Standard Supabase URL, anon key og service-role key må finnes i Edge-miljøet. Service-role-nøkkelen skal aldri i appen.
5. Hent hele OSM-ways i administrativt gateområde. Kjør `npx tsx scripts/gatekampen-catalogue.ts --input hele-området.json --area nordnes-v1 --scope <OSM-area-id> --output /tmp/nordnes.json`. Gjennomgå grensene/gatene på kart. Sett inn i `catalogues` administrativt og sett `published_at` etter kontroll. Publiserte rader er fryst.
6. Bygg med `EXPO_PUBLIC_GATEKAMPEN_SUPABASE_URL=https://<ref>.supabase.co` og `EXPO_PUBLIC_GATEKAMPEN_SUPABASE_KEY=<offentlig anon/publishable key>`. Aldri hemmelige nøkler med `EXPO_PUBLIC_`.
7. Test OTP, profil, gruppe, invitasjon, medlemskap og frivillig opplasting med to brukere. Gruppen får én 28-dagerssesong. Ny sesong i samme gruppe er neste iterasjon.

RPC-er autoriserer hver mutasjon. Medlemskap/invitasjoner/innsending bruker transaksjoner og låsing. Klienten kan ikke skrive resultater. Serveren krever dekning innen både sesongen og medlemsperioden. En gate teller én gang. Lagdekning er union av medlemmenes godkjente gater, aldri summerte halve gater.

## Databasekontroll

Installer `@electric-sql/pglite` i separat verktøymappe og kjør fra roten:

```
NODE_PATH=/sti/til/verktøy/node_modules node scripts/test-gatekampen-db.cjs
```

Faktisk PostgreSQL i WASM; Auth-tabell og JWT-kontekst er testfixturer. Tester privat tilgang, eierinvitasjon, rate limit, poengskriving, idempotens, ugyldig bevis og fryste kataloger. E-postlevering, Edge-hosting og fysisk GPS må testes separat.

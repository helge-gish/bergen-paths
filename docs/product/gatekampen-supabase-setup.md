# Gatekampen — Supabase tilkoblet 25. oktober 2026

Prosjekt: `haerxrnhqmvpxmzaqcko`, Gatekampen, Frankfurt. Bløffl er ikke endret.

## Utført

- Tilkoblingen virker med prosjektlesing, migrasjon, SQL og Edge Function-publisering.
- Migrasjonen `20261025084710_gatekampen_initial_private_competitions` oppretter seks offentlige og fire private tabeller. RLS er aktivert på alle.
- Invitasjonskoder, kontrollkvitteringer og rate limits ligger i et ikke-eksponert `private`-skjema. Privilegerte funksjoner ligger der også; offentlige RPC-innganger kjører med innringerens privilegier og delegerer til eksplisitt autoriserte implementasjoner.
- `gatekampen-verify` versjon 1 er aktiv med JWT-kontroll. Serveren validerer brukeren gjennom Auth, medlemskap og GPS før resultatet lagres. Rate limit reserveres atomisk før geometrianalysen.
- Live SQL-test med to medlemmer og én utenforstående bestod: privat innsyn, invitasjon, sperret direkte poengskriving, verifisert poeng, idempotens og lagdekning. Alle testbrukere/grupper ble rullet tilbake; tomme datatabeller bekreftet etterpå.
- Den offentlige publishable-nøkkelen er lagt i `apps/gatekampen/publicConfig.ts`. Ingen service-role- eller secret-nøkkel ligger i klientkoden.
- Lokal PostgreSQL-test og TypeScript-kontroll bestod etter endringene.

## Klargjort for 0.1.1

- Innloggingskoden knyttes til adressen den faktisk ble sendt til. Endret adresse rydder kodefeltet, og ny kode har 60 sekunders ventetid.
- Appen henter lagret visningsnavn, krever navn før gruppestart og viser invitasjonsknappen bare for eieren. Serveren håndhever fortsatt rettighetene.
- Parallelle kall deler én tokenfornyelse. Avvist fornyelse gir ny innlogging; midlertidig nettfeil beholder kontoen. Utlogging rydder telefonen også uten nett og venter på eventuell pågående fornyelse.
- 313 automatiserte tester og TypeScript-kontroll bestod. Auth-testene bruker simulert HTTP og lagring; de dokumenterer ikke ekte e-postlevering eller fysisk telefon.
- `scripts/fetch-gatekampen-catalogues.py` er klar til å hente hele OSM-områder gjennom normal nettforbindelse. Den lagrer originaldata, kilde, hash og utkast; publiserer ingenting automatisk.

## Gjenstående før venneprøve

1. E-postmal for kodeinnlogging. Den installerte MCP-tilkoblingen tilbyr ikke endring av Auth-konfigurasjon. Sett Magic Link-malen til innholdet i `apps/gatekampen/backend/email-code.html` via [e-postmalene](https://supabase.com/dashboard/project/haerxrnhqmvpxmzaqcko/auth/templates). Kontroller også førstegangsregistreringens mail i en ekte innloggingstest. Ingen e-post er sendt automatisk.
2. Supabases innebygde e-postsender begrenser mottakere til organisasjonens medlemmer. Egen SMTP-avsender må konfigureres før vanlige venner kan inviteres. Ikke legg venner til som databaseadministratorer for å komme rundt begrensningen. [Offisiell SMTP-veiledning](https://supabase.com/docs/guides/auth/auth-smtp).
3. Hent og gjennomgå hele gatekataloger fra OSM for konkurranseområdene. Ingen katalog er publisert ennå. Den lokale kjøremaskinens nettpolicy blokkerer `overpass-api.de`; det konfigurerte domenet `overpass.api.de` er en annen adresse. Tillat `overpass-api.de` og `haerxrnhqmvpxmzaqcko.supabase.co` i miljøets nettverksinnstillinger for datahenting og HTTP-test. Ikke opprett fiktive eller radiusklippede konkurransegater.
4. Test faktisk Auth/REST/Edge-sammenheng og to telefoner. SQL-testen dekker ikke e-postlevering eller HTTP/JWT-transport.
5. Kontroller og publiser neste APK etter at innlogging og konkurranseområder kan brukes. 0.1.1 er bygget med den offentlige klientkonfigurasjonen, samme app-ID og samme signeringssertifikat som 0.1.0. Den kan oppdateres uten avinstallering. 0.1.0-APK-en blir ikke automatisk oppdatert av serveroppsettet.

## Konkret e-postoppsett

Den tilkoblede Supabase-MCP-en kan administrere databasen og Edge Functions, men tilbyr ikke Auth-innstillinger. Nettmiljøverktøyet kan bare lese konfigurasjon. Derfor må disse to oppsettene gjøres i de respektive innstillingene; dette er ikke en generell forespørsel om å godkjenne utviklingsarbeidet.

For en første innlogging med organisasjonseierens adresse kan Supabases innebygde sender brukes innenfor dens begrensninger. På [Email Templates](https://supabase.com/dashboard/project/haerxrnhqmvpxmzaqcko/auth/templates), bruk emnet `Din innloggingskode til Gatekampen` og innholdet i `apps/gatekampen/backend/email-code.html` for **Magic Link** og **Confirm signup**. Begge får kode slik at også første registrering fungerer uten en nettleserlenke. Behold bekreftelse av e-post aktivert. Kjør én faktisk innlogging i appen etter lagring.

For venner anbefales Resend hvis ingen avsender finnes fra før. Valg av tjeneste og et domene brukeren disponerer må avklares først. Ikke anta at et domene kan brukes bare fordi det står i e-postadressen.

1. Opprett avsenderdomene i Resend, gjerne et eget underdomene. Legg inn DNS-postene Resend oppgir, og vent på bekreftet domene. Ikke endre eksisterende e-posts MX-poster.
2. Opprett en nøkkel for sending fra dette domenet. Legg nøkkelen direkte i Supabases SMTP-passordfelt; den skal ikke inn i chat, GitHub eller APK.
3. I Supabase: **Authentication → Email → SMTP Settings**, aktiver egen SMTP. Server `smtp.resend.com`, port `465`, brukernavn `resend`, passord lik Resend-nøkkelen. Avsendernavn `Gatekampen`; avsenderadresse må høre til det verifiserte domenet.
4. Lagre kodemalene ovenfor, og prøv først egen innlogging, deretter en invitert venn som selv ber om kode. Ikke send testmeldinger til andre automatisk.

[Resends oppdaterte Supabase-veiledning](https://resend.com/docs/send-with-supabase-smtp), kontrollert 25. oktober 2026. Ingen ny e-posttjeneste eller betalt abonnement er opprettet.

## Supabase-rådgivere

Ingen sikkerhetsfeil eller advarsler. Fire INFO-punkter gjelder RLS uten policies på de private tabellene; dette er bevisst standardnekt for klienter, med tilgang bare gjennom autoriserte serverfunksjoner. [Forklaring av kontrollen](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Ytelsesrådgiveren rapporterer ubrukte indekser fordi prosjektet er nytt og tomt. De beholdes for medlemsoppslag og fremmednøkler. [Forklaring av kontrollen](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

## Oppsettshistorikk

Første migrasjonsforsøk fikk `Invalid or expired requestState`. Tabellenes fravær ble kontrollert før ett nytt forsøk, som lyktes. Det er én migrasjon i prosjektet. Bootstrap-SQL skal ikke kjøres på nytt der.

CLI-verktøyet kunne ikke startes i dette arbeidsmiljøet (nyeste utgave forsøkte å skrive til en skrivebeskyttet hjemmemappe; den pinnede 2.81.3-utgavens postinstall feilet). Den testede, ferdige migrasjonen ble derfor publisert gjennom Supabase MCP til den tomme fjernbasen. SQL-kildene og det faktiske migrasjonsnavnet/versjonen er bevart; ingen lokal migrasjonsfil med oppdiktet tidsstempel er laget.

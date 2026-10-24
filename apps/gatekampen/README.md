# Gatekampen — første milepæl

Besluttet: private vennegrupper først, åpne konkurranser senere. En sesong varer foreslått fire uker. Hver fullført gate gir ett poeng i sesongen, og personlig samling varer etter at sesongen er over. Ingen hastighetskonkurranse. Samme fryste gatesett gjelder alle i gruppen; radius rundt hver enkelt bestemmer ikke konkurransens vanskelighet. Trapper og gangstier filtreres bort før gatenavn grupperes.

## Implementert grunnlag

- `rules.ts`: gatenes kildefilter og idempotent poengberegning per spiller/sesong, med halvåpent tidsvindu. Klientoppgitte poeng er ikke en datakilde.
- `schema.sql`: separat konto-/gruppemodell for Supabase Auth/PostgreSQL, sesonger, gatesnapshot, serververifiserte gjennomføringer og private invitasjoner. RLS er slått på; vanlige klienter kan ikke skrive medlemskap eller resultater.

## Neste vertikale leveranse

1. Opprett et eget Supabase-prosjekt i europeisk region og konfigurer e-post/OTP og appens redirect. Ingen backend-konto eller driftsmiljø er tilkoblet i denne arbeidsøkten.
2. Kjør og integrasjonstest migrasjonen med to brukere, en utenforstående og utløpte sesjoner. SQL er foreløpig et grunnlag, ikke en verifisert produksjonsmigrasjon.
3. Implementer transaksjonelle API-er for opprett gruppe og bruk invitasjon (utløp, maksimalt antall bruk, låst invitasjonsrad, rate limit). Vis gruppemedlemmers valgte navn gjennom en autorisert medlems-API; profiler er ikke offentlige.
4. Egen app-id `no.gatekampen.app`, innlogging, gruppeliste og sesong. Tokens i OS-beskyttet lagring. Ingen Tråkk-spor eller persondata importeres automatisk.
5. Last opp frivillig delte GPS-aktiviteter. Serveren beregner gatesamsvar mot sesongens katalog, dedupliserer hendelser og skriver gjennomføringer. GPS-data er ikke bevis mot bevisst spoofing; ha kontrollregler og tvist-/moderatorflyt før åpne konkurranser.
6. Realtidsoppdateringer av gruppens resultater. Venners posisjon eller råspor vises ikke på resultatlisten.

Ingen spillbar nettapp eller live-konkurranse er publisert ennå. Drift/innlogging og integrasjonstester gjenstår før venner inviteres.

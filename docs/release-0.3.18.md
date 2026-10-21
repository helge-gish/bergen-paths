# Tråkk 0.3.18 — enklere skjermer og utstyr på figuren

Android testutgave, versionCode 23. Installer som oppdatering uten å avinstallere.

## Skjermene

Logoheaderen og de store velkomstoverskriftene er fjernet fra Utforsk, Turlogg og Deg. Kartets gjentatte forklaringstekst er fjernet; radiusvalg og posisjonsknapp er samlet. Finn sti er fortsatt tilgjengelig både før og under tur. Status ved manglende GPS, startmerket, kartforklaringen og bekreftelser ved lagring/flytting er beholdt.

Startdialogen går rett til valg og startknapp. Turloggens tomtilstand og noen forklaringer er forkortet. Figurens gjentatte nivåtekst, slagord og neste-utstyr-setning er fjernet. Forklaringen om beregning av XP ligger under appinformasjon. Gatekortet og detaljvisningen bruker «X av Y gater gått», også for skjermleser. Reglene for telling er uendret.

## Opptjent utstyr

Begge Tråkkvenn-variantene viser tursko fra start, caps fra nivå 2, ryggsekk fra 3, turstav fra 5 og gullmerke fra 8. Utstyret tas på automatisk og er kumulativt. Utstyrssamlingen viser «På» for det figuren bærer. Ingen ny valgmeny eller lagret antrekktilstand er innført.

Antrekket avledes fra de samme nivågrensene som samlingen. Ny beregning etter sletting av turer oppdaterer både figuren og samlingen. Figurvalg og eksisterende fremgang beholdes. Rolig animasjon og innstillingen for redusert bevegelse beholdes.

Illustrasjonene er generert for appen, følger med i APK-en og krever ikke nett. Originalbildene er uendret; komponenten viser én av ti bildeutsnitt med felles høyde og grunnlinje. Dette er automatiske hele antrekk. Fri kombinasjon av separate plagg er fortsatt et senere steg i figurbyggeren.

## Kontroll

TypeScript og 200 app-/komponenttester består. Nye tester dekker utstyrsgrenser, ny beregning, begge figurvarianter, bildebytte, klipping og skjermleserbeskrivelser. Alle ti figurutsnitt er visuelt kontrollert i en nettleser som gjengir portrettkomponentens geometri. Det erstatter ikke kontroll av React Native på telefon.

Rent Android-appbygg og seks native tester består. APK-en er kontrollert for versjon, samme signatur som forrige utgave, Hermes, de nye tekstene, fravær av de fjernede velkomsttekstene og kamerarettingen i faktisk DEX-kode. Begge figurarkenes synlige piksler og gjennomsiktighet er kontrollert mot kildebildene. Fysisk telefon er ikke tilgjengelig i byggmiljøet.

APK: 45652536 byte. SHA-256: `863a1cdb09b5c78cdf16a9693865223c2c88c88b4cab37519902f9bae32d2767`.

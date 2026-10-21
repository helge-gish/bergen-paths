# Tråkk 0.3.24 — gater, trapper og stier gått

Android testutgave, versionCode 29. Installer som oppdatering uten å avinstallere.

Deg har ett samlet nærområdekort med «X av Y gater gått», «X av Y trapper gått» og «X av Y stier gått». Hver rad har fremdrift og åpner sin kategori med delvis gått, å utforske og fullført. Treff kan vises på kartet. Utforsk får ingen nye tellere.

Alle tellerne bruker samme radius og posisjon, hentede kartdata og eksisterende GPS-bevis fra lagrede turer. Gater krever fortsatt navn. Trapper og stier uten navn inngår også. Manglende kartgrunnlag vises med strek; pågående tursjekk og feil oppgis. Kartgrunnlaget kan være ufullstendig.

Sammenhengende navngitte kartdeler grupperes innen hver kategori. Unavngitte kartdeler kobles kun gjennom felles endepunkter der traseen fortsetter uten forgrening. Et forgreinet stinett blir dermed ikke ett stort fullføringsmål. Alle deler av en gruppe må være fullført, også deler utenfor radiusen. Underliggende lagrede kart-ID-er og belønninger endres ikke.

Eksisterende fullføringsregler beholdes: stier krever minst 85 prosent av hver kartdel og kan samle dekning fra flere lagrede turer. Gater og trapper krever minst 95 prosent og besøk ved endene på én lagret tur per kartdel. Pågående turer teller etter lagring. Slettede turer gir ikke fortsatt fullføring.

TypeScript og 214 tester består. Nye kontroller dekker kategoriskille, hele grupper over radiusgrensen, navnløse fortsettelser og forgreninger, reelle GPS-spor, sletting, pågående turer og navigasjon fra teller til riktig detaljliste og kartobjekt. Android-APK er kontrollert for versjon, Hermes og samme signatur. En fysisk telefon er ikke tilgjengelig i byggmiljøet.

APK: 45664156 byte. SHA-256: `e93a6ee2091f8179105c222083140d86ac338e56f97d18ba3ad3c33e7a7081ba`.

# Tråkk 0.4.3 — strekk bare når du lager dem

Utforsk viser «Start strekk» uten et automatisk startmerke fra registreringsstart. Handlingen krever et ferskt GPS-punkt og setter dette som strekkstart. Da vises et lite kort med «Stopp og lagre strekk» og «Avbryt», og kartet merker punktet «STREKKSTART».

Lagring fjerner merket og legger strekket til de eksisterende automatiske målingene. Avbryt fjerner bare kladden; råsporet, tidligere lagrede strekk og registreringen beholdes. En for kort strekning eller feil ved lagring lar kladden stå slik at brukeren kan prøve igjen. Nytt strekk starter alltid fra den nye, eksplisitte plasseringen.

Kladdens tilstand lagres per registrering og tåler appbytte og gjenåpning mens samme registrering pågår. Pause av registreringen, inkludert automatisk batteripause, avslutter en ulagret kladd uten å lagre et strekk. Gamle registreringer uten eksplisitt kladdtilstand får ikke automatisk startmerke. Tidligere lagrede strekk beholdes.

Kortet med registrert distanse, fart, høydemeter og bevegelsestid er flyttet fra Utforsk til Logg.

Start/Pause for GPS, trening, områdevalg, Logg og AR beholdes. Det kreves ingen nye tillatelser. Installer som Oppdater.

Kontroll: lagring/gjenåpning, avbrudd, ny plassering, for kort strekk, avslutning av registrering og kartets merkesynlighet testes. Android-APK kontrolleres for versjon, app-ID, signatur og innebygde funksjoner. Ingen fysisk telefon eller emulator er tilkoblet.

264 app-/domenetester, TypeScript-kontroll, Android-bygg og 14 native tester består. APK: 43551246 byte. SHA-256: `cf03dbd338770080102f8c0f5598e8a766612ccc42617b746a07738183a09e7f`.

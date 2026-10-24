# Tråkk 0.4.2 — enklere utforsking

## Flyt

Start er eneste vei videre uten aktiv registrering. Første gang forklares posisjon, bakgrunnsregistrering og lokal lagring før Android-tillatelsene forespørres. Avslag returnerer til Start, uten å montere kart, AR eller posisjonslytteren for kartet. Registreringen fortsetter ved skjermlås og appbytte. Tydelig Pause stopper GPS og taletrener, lagrer målingene og returnerer til Start. Appåpning gjenopptar ikke en pauset eller avsluttet registrering. Å sveipe bort appen er ikke stoppmekanismen; bruk Pause.

To hovedfaner: Utforsk og Logg. Innstillinger åpnes fra tannhjulet. Utforsk rommer kart/AR med naturstifilter, treningsvalg og egne strekk. Tidligere egendefinerte strekk blandes ikke inn i AR-søk etter naturstier. De tre treningsprogrammene fra 0.4.1 er beholdt.

## Område og logg

Fast radius 5 km. Første Start fester området rundt fersk GPS-posisjon. Innstillinger → Endre område lar brukeren plassere et midtpunkt i kartet og godkjenne det. Området flyttes ikke av GPS-jitter eller vanlig utforsking. Ved en fersk posisjon over 25 km unna stopper Tråkk registreringen før punktet lagres i sporet, og foreslår et nytt område. «Utforsk her» henter en ny posisjon og krever eksplisitt godkjenning. Android kan fortsatt be om manglende systemtillatelser. Gamle spor beholdes.

Logg teller bare naturstier som treffer aktivt område. Sammenhengende navngitte kartdeler grupperes; unavngitte deler kobles bare ved entydige fortsettelser. Innom viser delvis registrert dekning. Gått krever minst 85 prosent dekning av hver kartdel i gruppen, med 15 meters kart/GPS-toleranse. Flere besøk kan til sammen fullføre en sti. Gått er altså ikke det samme som en sammenhengende tidtatt gjennomføring; automatiske stitider har fortsatt sine egne strengere regler. Dårlig GPS og bilfart utelates. Dekning beregnes på nytt fra lagrede spor mot gjeldende kartdata, bare mens Logg er åpen. Historikken viser første registrerte besøk og gir tilgang til kartet.

## Batteri og profil

Automatisk pause krever ti minutter med ferske GPS-punkter med nøyaktighet høyst 30 meter, innen 30 meter fra et anker, uten rapportert fart over 0,7 m/s. Hull over ett minutt starter observasjonen på nytt. En aktiv treningsklokke unntas. Når treningsprogrammet er satt på pause eller avsluttet, kan batteripausen utløses. Etter automatisk pause må Start trykkes for å registrere igjen. Det kan også skje ved en lang benkepause. Manglende/usikker GPS gir ikke automatisk pause alene, så funksjonen garanterer ikke stopp innendørs. Manuell Pause stopper alltid registrering; feil ved stopp av GPS vises uttrykkelig. Åttetimersgrensen fra 0.4.0 beholdes.

Vekt, kjønn og alder er valgfrie, lokale profilfelt med validering og eksplisitt Lagre. Ingen nye trenings- eller helseberegninger er innført basert på disse opplysningene.

## Kontroll

Start/samtykke/avslag, Pause og gjenåpning, to faner, manuell områdefesting, reisegodkjenning, bakgrunnsstopp, stidekning, profilvalidering og batteripause kontrolleres med tester. APK bygges med samme app-ID og signeringssertifikat. Ingen fysisk telefon eller emulator er tilgjengelig; reelt batteriforbruk, OS-bakgrunnsatferd og visuell bruk må feltprøves. Androids varslingsinnstillinger kan fortsatt skjule låseskjermvarsler.

263 app-/domenetester, TypeScript-kontroll, Android-bygg og 14 native tester består. APK: 43549998 byte. SHA-256: `148b559c82cfcfe8cc6ad1dcf10e77d973d8b88042b7b7e08a115a5e1e33186d`.

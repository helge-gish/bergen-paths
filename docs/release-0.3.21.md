# Tråkk 0.3.21 — turspor i Finn sti

Android testutgave, versionCode 26. Installer som oppdatering uten å avinstallere.

Kartet i Finn sti mottok bare stidata og posisjon. Lagrede turer og punktene fra en pågående tur ble ikke sendt til kartkomponenten, selv om de ble vist i hovedkartet.

Finn sti får nå de samme lagrede turene, aktive GPS-punktene og startmerket som hovedkartet. Tidligere turer vises i lilla og turen som pågår i blått, over stiene. Tegnforklaringen viser tilsvarende spor. Tursporene er tilgjengelige i vanlig kart og fullskjerm og kommer tilbake etter bytte fra kamera. Historikken vises også med sist kjente posisjon mens appen venter på fersk GPS. Nye punkter og slettede turer oppdateres fra appens eksisterende dataflyt.

Stilag, farger, GPS-filtrering og håndtering av hull i sporene er uendret. Det er ikke lagt inn nye innstillinger. Logoen og plasseringen av gatekortet bare under Deg beholdes.

TypeScript og 201 app-/komponenttester består. En ny integrasjonstest kjører Finn sti sammen med kartkomponenten og kontrollerer lagrede turer uten fersk GPS, voksende aktivt spor, startmerke, lagrekkefølge over stiene, fullskjerm/minimering, kamera/kart-bytte og sletting. Native kartvisning på fysisk telefon er ikke tilgjengelig i byggmiljøet.

Kartnavn i dagens topografiske rasterkart er en del av kartbildet. Denne utgaven endrer ikke skriftstørrelse eller kartgrunnlag.

Android-bygg, APK-versjon, Hermes og samme testsignatur som tidligere utgaver er kontrollert. Byggskriptet bekrefter at kamerarettingen fortsatt er kompilert.

APK: 45652996 byte. SHA-256: `044c8f36783d74c3a7fa7ef9a2151dde445925a525f4dd432f82583d4bc4dd96`.

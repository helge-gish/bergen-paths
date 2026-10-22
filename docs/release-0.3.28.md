# Tråkk 0.3.28 — lesestørrelse og avstand på kartet

Android-testutgave, versionCode 33. Installer som oppdatering for å beholde turene.

- AR-infopanelet har A−/A+ og forstørring med to fingre, fra 100 til 200 %. Navn, fakta og knappetekst vokser sammen og brytes om. Størrelsen huskes lokalt. Trykk prosenttallet for å tilbakestille. Én finger ruller fortsatt panelet; kart og kamerabilde forstørres ikke av denne innstillingen.
- Valgt sti, trapp, gate eller sted får et kort med navn og omtrentlig luftlinjeavstand inne på kartet. Kortet vises både i vanlig visning og fullskjerm. Avstanden måles til nærmeste kartlagte del, ikke gatens midtpunkt, og oppdateres med posisjonen. Adskilte deler og ugyldige koordinater forbindes ikke. Dette er ikke gangavstand langs en rute.
- «Min posisjon» er en tydelig knapp i kartet, også i fullskjerm. Den sentrerer på brukeren uten å fjerne valgt element. I Utforsk ber knappen om fersk GPS når posisjonen er gammel. Man kan fortsatt sentrere på sist kjente punkt mens GPS-søket pågår. En nyere posisjon får forrang over et eldre punkt fra en aktiv tur; selve tursporet endres ikke.
- Avstand fra gammel GPS merkes «Fra sist kjente posisjon». Manglende posisjon eller geometri får ingen oppdiktet avstand.

## Kontroll

226 app-/komponenttester og TypeScript-kontroll består. Nye tester dekker lesestørrelse, lagring, tilbakestilling, knappetrykk, tofingergest og gjenopptatt rulling, avstand til linjer med adskilte/ugyldige deler, fullskjerm, bevart kartvalg og sentrering under GPS-søk.

Android-bygget og 14 native tester består. APK-ens versjon, signatur, innebygde JavaScript og eksisterende ARCore-kode er kontrollert. Ingen fysisk Pixel 6a er tilkoblet; tofingergest og native kartvisning må prøves på telefonen.

APK: 46031226 byte. SHA-256: `9056f8e07abbe9bcccf5c8d3b71227d124ea0e7f695b9c740e885f91ee8a3cfe`.

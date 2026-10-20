# Tråkk 0.3.11 – ryddigere turflyt

Denne versjonen samler forbedringene fra feltturen og rydder i skjermene før videre gamifisering.

## Turen og låseskjermen

- GPS-tjenestens eksisterende Android-varsel viser en systemstyrt stoppeklokke, registrert distanse og stigning. Utvidet visning har snittfart, GPS-status og aktuell 4×4-fase. Klokken trenger ikke nye GPS-punkter eller en JavaScript-timer for å gå videre.
- 4×4-faseskifter gir ulike vibrasjonsmønstre for rask gange, rolig gange og fullføring, også når talelyden er av. En lagret fasepeker hindrer at gamle vibrasjoner spilles av ved gjenåpning. Androids varsel-, låseskjerm- og vibrasjonsinnstillinger gjelder fortsatt.

## Kart og strekk

- Kartet starter ved GPS-posisjonen. Uten fersk GPS brukes sist kjente posisjon fra telefonen eller lagrede turspor, tydelig merket som tidligere posisjon. Første gangs bruk uten noen posisjon viser en GPS-handling fremfor et verdensutsnitt.
- Hjemmeområde trenger ikke settes. Radius velges med 1/3/5 km direkte ved kartet; den doble innstillingen og minikartet under Deg er fjernet.
- Strekkets startpunkt vises i kartet. «Sett slutt og lagre strekk» bekrefter lagring med distanse, tid, dialog og kort vibrasjon. Flytting av startpunkt forklares og bekreftes. Angrefristen er ett minutt; hele tursporet beholdes.

## Navn, tale og færre valg

- Tur- og strekknavn er vanlig tekst. En liten «Endre»-handling åpner redigering. Navnforslag vises bare rett etter at turen avsluttes. Navn settes automatisk; turstart har ikke lenger navnefelt eller forslag.
- Norsk talestemme velges automatisk. Stemme- og dialektvalg er fjernet. Kommentarene har mer variasjon, mer energi og bruker registrert tid, distanse, stigning og treningsfase. I Bergensområdet brukes bergensk ordlyd automatisk; uten et kjent støttet område brukes norsk ordlyd. Dette gir ikke telefonens standardstemme en ny bergensk uttale.
- Ekstra målinger, vektinnstilling og appforklaringer er skjult bak egne handlinger. Samling og mål finnes under Deg; gjentatte samlingskort og løpende tekniske bakgrunnsmeldinger er fjernet fra turstart/forsiden. Eksport er fortsatt lett tilgjengelig.

## Kontroll og begrensninger

JavaScript-regresjonene omfatter kartets reserveposisjon, fersk GPS kontra historikk, lokal ordlyd, faktabaserte kommentarer og eksisterende tur-, samlings- og treningsregler. Native Android-tester med Robolectric kontrollerer varselets identitet, stoppeklokke, offentlig visning, GPS-opphold, gjenoppretting av varselet og vibrasjon ved faseskifte uten tale eller gjentakelser.

TypeScript, alle 148 JavaScript-tester og fire native Android-tester består. Android-releasebygget fullførte med de native testene inkludert. Disse kan kjøres sammen med byggingen med `TRAKK_ANDROID_CHECKS=1 python3 scripts/build-android.py`.

Fysisk felttest av den nye APK-en gjenstår. Uttale og lydkvalitet avhenger av telefonens installerte norske talestemme. Visning på låseskjermen og vibrasjon kan begrenses av Android-innstillingene. Gamifisering er ikke utvidet i denne versjonen.

Installer som **Oppdater** over 0.3.10, uten å avinstallere eller tømme appdata. Pakkenavnet er fortsatt `no.trakk.app`; versjonskoden er 16.

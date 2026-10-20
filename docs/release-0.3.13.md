# Tråkk 0.3.13 – stedsnavn på strekk

Nye strekk får automatisk et beskrivende navn fra lokale kartdata, for eksempel «Sandvikskirken – Fløyen via Skredderdalen». Retningen følger GPS-sporet.

- Navngivingen brukes både ved «Sett slutt og lagre strekk» under turen og når et tidsrom lagres fra en avsluttet tur.
- Start og slutt knyttes til nærliggende navngitte steder eller traseer. Nære landemerker prioriteres fremfor veinavnet under dem.
- Ett relevant sted underveis tas med når nøyaktige GPS-punkter bekrefter passeringen. En trasé som brukes som «via», må følges et tydelig stykke. Sammenhengende stier og trapper med samme navn regnes sammen for dette formålet.
- Lik start og slutt kan gi «Runde fra … via …». Strekk langs samme navngitte trasé kan få «Langs …». Dersom bare den ene enden er kjent, brukes «Fra …» eller «Til …».
- GPS-opphold brukes ikke som bevis for en passering. Manglende eller usikre stedsnavn gir et enkelt standardnavn. Lange navn beholder begge endepunktene innen grensen på 80 tegn; «via» utelates først.
- I turloggen vises navnet som vanlig tekst og oppdateres når tidsrommet endres. En valgfri «Endre»-handling åpner navnefeltet. Et eget valgt navn beholdes.

Det brukes allerede nedlastede kartdata, uten ny nettjeneste eller ekstra innstillinger. Eksisterende lagrede strekk omdøpes ikke automatisk. Navngiving kjøres ved lagring eller eksplisitt valg av tidsrom, ikke for hvert GPS-punkt eller hvert klokkeslag.

## Kontroll

TypeScript og 165 JavaScript-tester består. Nye tester dekker retning, fra/til/via, oppdelte OSM-traseer, delstrekninger, rundturer, GPS-opphold, dårlige posisjoner, lange navn, manglende kartdata og at egne navn overlever lagring og gjenåpning.

En syntetisk lokal ytelsessjekk med 5 000 kartobjekter, 500 000 kartpunkter og 4 000 GPS-punkter brukte omtrent 63 ms første gang og 13 ms med kartindeksen i minnet. Dette er en kontroll på byggemaskinen, ikke en måling på telefon.

Android-versjon 0.3.13 har versjonskode 18. Fysisk test av navneforslagene gjenstår; kvaliteten avhenger av tilgjengelige kartnavn.

Installer som **Oppdater**, uten å avinstallere eller tømme data.

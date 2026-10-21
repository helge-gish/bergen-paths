# Tråkk 0.3.22 — AR-status og nærhetshint

Android testutgave, versionCode 27. Installer som oppdatering uten å avinstallere.

## Feilene

Finn sti krevde minst to meters bevegelse mellom GPS-oppdateringer. En bruker som stod stille kunne derfor få en gammel posisjon selv med telefonen i bruk. Kameravisningen krevde i tillegg GPS yngre enn 15 sekunder, og startet/stoppet retningssensoren hver gang GPS-statusen skiftet. Vanlige gater var utelatt fra målutvalget. Hvis nærmeste sti lå under åtte meter unna, skjulte statusmeldingen også andre synlige retningshint. «Prøv kamera igjen» ble vist selv når kameraet fungerte.

## Endret oppførsel

- Finn sti ber om høy nøyaktighet, oppdateringer hvert sekund og null minimumsavstand. GPS kan oppdateres mens brukeren står stille; faktisk hyppighet bestemmes av Android.
- Retningssensoren bruker koordinatene til magnetisk korreksjon og fortsetter gjennom gammel eller upresis GPS. Den stoppes fortsatt når appen går i bakgrunnen eller kameravisningen lukkes. Retningsetiketter krever fortsatt et ferskt, pålitelig kompass og GPS innen 25 meter. GPS kan være opptil 30 sekunder gammel, i samsvar med resten av Finn sti.
- Kameraet viser separat GPS-status med oppgitt nøyaktighet og alder, kompassstatus og en eksplisitt «Klar»-melding når retningsvisningen kan brukes. Upålitelig kompass gjøres ikke kunstig pålitelig.
- Stier, trapper, egne strekk og navngitte gater fra nedlastede kartdata kan gi kamerahint. Vanlig stiliste i kartmodus beholder sitt stiutvalg. Valgt gate kan vises i hovedkartet eller brukes som utgangspunkt for tur; dette beregner ingen rute.
- Når retningen ikke kan brukes, viser en fast nærhetsliste opptil tre steder i kamerabildet, tydelig uten retningsplassering. Gammel GPS merkes «Ved sist kjente posisjon». Et sted nærmere enn GPS-usikkerheten vises i nærhetslisten, og skjuler ikke andre gyldige retningsetiketter.
- «Oppdater GPS» oppdaterer GPS-overvåkingen uten å starte kameraet på nytt. «Prøv kamera igjen» vises ved kamerafeil. En feil ved oppstart av retningssensoren kan prøves igjen separat.

GPS-data og sensorpålitelighet kan fortsatt være utilstrekkelige på telefonen. Nærhetslisten er et alternativ til tom visning, ikke en presis plassering i terrenget. Gaten må finnes i hentede kartdata; endringen garanterer ikke at en bestemt gate er lastet ned på enheten.

## Kontroll

TypeScript og 205 app-/komponenttester består. Åtte kameratester er kjørt på nytt etter siste tekstjustering. Nye tester dekker stillestående GPS, navngitte gater, kompass som fortsetter gjennom kvalitetsendringer, separat GPS-oppdatering, valg fra nærhetslisten, eksplisitt klar-status, gammel GPS og samtidige nære og fjernere mål. Bakgrunnspause og kamerafeil er fortsatt dekket. Fysisk Pixel 6a er ikke tilgjengelig i byggmiljøet; reell kompasspålitelighet må bekreftes der.

Android-bygg, APK-versjon, Hermes, de nye status-/hinttekstene og samme testsignatur som tidligere utgaver er kontrollert. Byggskriptet bekrefter at kamerarettingen fortsatt er kompilert.

APK: 45655660 byte. SHA-256: `e0fa53c630331c7e2bbcccba76452843eb42657ee56daa50661d699d628d7e09`.

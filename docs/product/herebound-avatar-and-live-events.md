# Herebound: avatar og publikumsarrangementer

Produktnotater 24. oktober 2026. Dette beskriver nye ønsker og anbefalinger, ikke funksjoner levert i 0.2.0. Første prioritet er fortsatt fysisk testing av ULTIMA X ved Meyermarken.

## Avatar som varig identitet

Brukeren ønsker en svært gjennomarbeidet avatarbygger, med World of Warcraft og Fortnite-skins som mulige kvalitets- og stilreferanser. Herebound skal ha sitt eget visuelle uttrykk. Figuren følger med mellom spill, inkludert relevante egenskaper, utstyr, hjelpere og sekk.

Anbefalt retning: stiliserte, uttrykksfulle 3D-figurer med tydelige silhuetter, gode materialer og animasjoner som gjør ansikt, kropp, bekledning og utstyr til én sammenhengende figur. Se utstyr direkte på kroppen og i hendene; roter og zoom figuren under tilpasning. Begynn med få, gjennomarbeidede alternativer som kan kombineres, og ett komplett antrekk med håndholdt gjenstand, gange og hvileanimasjon. Kvalitet og sammenheng før stor katalog.

SDK-behov når dette bygges:

- Plattformeid utseende og eierskap; spill kan velge presentasjon uten å erstatte spillerens identitet.
- Felles skjelett, utstyrsplasser og festepunkter, samt kroppstilpasning og kontroll av gjennomtrenging mellom klær og kropp.
- En grafikkflyt med mobilbudsjett, detaljnivåer, nedlasting og mellomlagring. Samme utseende i figurbygger, kartportrett, tredjeperson og førstepersonshender.
- Skille kosmetisk utseende fra gjenstandens mekaniske effekter. Et antrekk kan være eid uten å gi samme effekt i hvert spill.

## Egenskaper og inaktivitet

Brukeridé: styrke, constitution og andre egenskaper kan avta når appen ikke brukes. Dette er foreløpig et forslag, ikke en bestemt forfallsregel.

Anbefaling: behold varige grunnverdier, nivåer, utstyr og oppnådde prestasjoner. Legg til en avgrenset, midlertidig «form» som bygges gjennom relevant spilling og gradvis går tilbake til grunnnivå etter en romslig pause. Ingen daglige innloggingskrav. Appåpning alene skal ikke telle som trening, og spillverdier er ikke målinger av spillerens faktiske fysiske helse.

Før implementering må vi velge friperiode, maksimumsbonus, nedgang og hvilken aktivitet som teller. Endringen beregnes fra serverens tid når tilstanden hentes, uten kontinuerlig bakgrunnssporing. Tap av en formbonus skal aldri slette eller slippe utstyr fordi bæreevnen synker. Eventuell overvekt må håndteres eksplisitt ved senere handlinger. Gjør reglene synlige og test om de faktisk motiverer, særlig etter lengre fravær.

## Brann: spill i pausen fra tribuneplassen

Brukeridé: Herebound som vert for underholdning Brann tilbyr publikum i kamppauser. Ingen avtale med klubben, stadionintegrasjon eller kapasitetsgaranti foreligger.

Et første spillforslag er «Tribunekampen»: publikum blir med på mobil via QR/lenke, velger eller får en tribuneseksjon, og samarbeider om korte oppgaver i et 3–5 minutters spill. Egen Herebound-figur deltar. En virtuell ball eller et mål kan vises i AR fra setet; treff avgjøres av avtalte spillregler, ikke antatt presis GPS. Storskjermen viser nedtelling og lagresultat. En eventuell kosmetisk premie følger figuren videre.

Første prøve bør kunne spilles fra setet uten AR, slik at kamera, tilgjengelighet og enhetsstøtte ikke stopper deltakelse. AR kan være en ekstra visning. Dette er en regel for dette publikumsformatet; ULTIMA X beholder AR som krav ved stedlige handlinger.

Nødvendige plattformdeler:

1. **Arrangementsøkt:** vert oppretter tid, sted, adgang, lag og spillpakke. Spillkatalogen må støtte tidsbegrensede arrangementer og direkte invitasjoner. GPS kan finne stadion, men kan ikke pålitelig avgjøre seterad eller seksjon. QR/kode og eventuelt billettintegrasjon er egne adgangsvalg.
2. **Rask deltakelse:** gjesteflyt og mobilnettleser for en lavterskel pilot; Herebound-appen tilbyr full figur og AR. Gjestebelønninger kan knyttes til konto senere. Ingen tvungen installasjon eller full avatarbygging midt i pausen.
3. **Serverstyrt spill:** felles klokke, runder, lagpoeng, rategrenser, idempotente handlinger, frakobling og gjeninntreden. Samme serverfundament som battle royale, men et annet interaksjonsformat.
4. **Driftsflate:** arrangøren kan åpne lobby, starte, pause, avslutte og avbryte. Separat storskjermvisning. Klubbens produksjon må kunne styre tidspunktet når pausen blir kortere enn planlagt.
5. **Nett og kapasitet:** forhåndslast små grafikkpakker, begrens meldingsmengden og test samtidige innlogginger, trafikkpulser og dårlig mobildekning på stedet. Ikke baser første format på kontinuerlig kamerastreaming eller skudddueller med svært lav forsinkelse.
6. **Felles stadion-AR, hvis valgt:** en egen kalibrerings- og lokaliseringsløsning fra tribuneplass til banekoordinater. Dagens lokale bakkeanker gir ikke automatisk et felles objekt korrekt plassert på banen for alle. Lys, tak, avstand og støttede telefoner må testes i stadionmiljøet.
7. **Belønninger og arrangørtilgang:** servergodkjente premier med grenser og deduplisering. En spillpakke får ikke skape ubegrenset Herebound-valuta. Avklar klubbens innhold, sponsorflater, rettigheter, behandling av deltakerdata og eventuell billettkobling med arrangøren.

Anbefalt pilotrekkefølge: liten simulert tribunespilløkt → avtalt prøve med 20–50 personer på stedet → lasttest mot avtalt publikumsmål → kontrollert kampdagspilot. Full stadion er et senere kapasitetsmål, ikke en egenskap ved dagens lokale APK.

Dette utvider SDK-kontrakten med arrangement, vert, lag, storskjerm og adgang. Det skal ikke innføre en ny figur, sekk eller pengeøkonomi, og ingen Brann-spesifikke regler skal hardkodes i verten.

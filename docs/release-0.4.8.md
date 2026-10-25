# Tråkk 0.4.8 – turmedaljer

Installer APK-en som **Oppdater**, uten å avinstallere. App-ID og signeringssertifikat er beholdt.

Når du velger **Avslutt tur**, åpnes en oppsummering med antall ulike stier og strekk gått ende til ende, distanse, høydemeter opp, tid i bevegelse og total tidsbruk. Medaljene vises her, i turkortene i LOGG og på passeringene som vant tidsmedaljer. LOGG viser også samlet medaljeantall.

## Regler

- Gull, sølv og bronse er personens beste, nest beste og tredje beste **ulike** resultat på tildelingstidspunktet. Første positive resultat gir gull merket «Første resultat», ikke «Ny personlig rekord». Like resultater gir ingen ny medalje.
- Turkategorier: flest ulike stier, flest ulike strekk, lengst distanse, flest høydemeter opp og lengst tid **i bevegelse**. Samme sti flere ganger øker ikke antallet. Tid i ro gir ikke ekstra medaljetid.
- Tidsmedaljer gjelder raskeste komplette passering av hver sti og hvert strekk. Hver retning sammenlignes separat. Ny personlig bestetid gir gull og viser forbedringen. Bare turens raskeste passering får medalje på en gitt rute/retning.
- Referansens geometri inngår i identiteten. Endret kartgeometri starter en ny tidsserie; den sammenlignes ikke med en annen trasé.
- Distanse rangeres i hele 10 meter, stitider i hele sekunder, bevegelsestid i hele sekunder og stigning i hele meter. Manglende høydedata er ikke null høydemeter, og gir ingen høydemedalje.
- Eksisterende GPS-kvalitets- og fartsfiltre brukes. Bare bekreftede komplette passeringer teller, ikke besøk, GPS-hull eller avviste transportpunkter. Dette er fortsatt ingen fullverdig automatisk klassifisering av bilkjøring.

## Lagring og oppgradering

Avsluttede turer får et varig resultat i en egen SQLite-tabell med tur-ID som unik nøkkel. Første lagring vinner, og senere rekorder eller kartendringer omskriver ikke tildelte medaljer. Nye og gamle turer uten resultat ferdigberegnes når appen er åpen; avbrutt beregning gjenopptas ved neste åpning. Første oppgradering behandler eksisterende turer kronologisk basert på GPS og kart-/strekkdata som er tilgjengelige lokalt. Medaljer krever ingen nettjeneste.

Tidligere medaljer som overlever en slettet tur beholdes; fremtidige medaljer sammenlignes med gjenværende turhistorikk. Sletting av en tur sletter dens resultat. Resultatene følger med i JSON-eksporten. Oppsummeringen åpnes etter avslutning, og spilles ikke av igjen ved appstart. Trening og pågående turer får ingen turmedaljer før turen er avsluttet.

## Kontroll

- 344 automatiske tester bestått, inkludert rangeringsrekkefølge, uavgjort, førstegangsresultat, retnings-/geometriskille, gjentatte passeringer, bevegelsestid, manglende høyde, GPS/transport, SQLite-lagring/omstart/sletting og oppsummeringens innhold.
- TypeScript-kontroll bestått.
- Android release-bygg og 14 native enhetstester bestått. APK-en er kontrollert for riktig app-ID, versjon, signatur og innpakket medaljefunksjon.
- Fysisk Pixel-test av fullføringsflyten gjenstår. Installer over 0.4.7, start tur, gå en kjent sti/et strekk og avslutt; sjekk oppsummering og samme medaljer i LOGG etter omstart.

APK: 43,722,214 byte. Versjonskode 42.

SHA-256: `8b9499f7f37d1f6a3f74493fc2eae25de8d6778d92738b72a35aca16fa39605d`

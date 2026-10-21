# Tråkk 0.3.16 — lesbart kart, stiinfo og ryddigere mål

Android testutgave, versionCode 21. Installer som oppdatering uten å avinstallere.

## Kartet

Tursporet som vises nå er blått med hvit kant. Tidligere turer er lilla og tynnere. Begge tegnes over stiene. Tidligere turspor tegnes én gang; lagrede strekk legges ikke oppå igjen som duplikater.

Sti/småsti vises med brune stiplede linjer, gangvei med heltrukne linjer og trapper med korte, tette streker. Typen følger tilgjengelig OpenStreetMap-data, ikke en antagelse om faktisk fremkommelighet eller norsk vanskelighetsgrad. Samlingsstatus endrer ikke lenger linjefargen. Ekstra fargelag for vanlige gater og generelle samlingsprikker er fjernet. Eksplisitt valgte steder/gater kan fortsatt fremheves.

Turkartet beholdes, med litt dempet farge og kontrast. Kartverkets fotruter er fortsatt på. Bakgrunnskartet er rasterbilder: enkeltsymboler, høydekurver og stedsnavn kan ikke fjernes individuelt. Høydekurver og terrengdetaljer beholdes. En kort tegnforklaring viser hovedfargene, med mer forklaring ved trykk.

## Trykk på sti

Trykk på en fremhevet sti eller trapp for navn, kartlagt lengde og registrert SAC-grad. Manglende gradering og høydemeter oppgis som ikke registrert. Lengden gjelder den markerte kartdelen, ikke en automatisk generert hel tur. Nærliggende parallelle stier velges etter avstand til geometrien ved trykket, ikke tilfeldig rekkefølge eller midtpunkt.

Infokortet står utenfor kartflaten. Valg og kartutsnitt beholdes ved fullskjerm/minimering. Fullskjermkartet tilpasser seg tilgjengelig høyde; et langt infokort eller tegnforklaring kan rulles. Stier som bare finnes i bakgrunnsbildet kan ikke trykkes på uten egne kartdata. Trykkbare stier bruker allerede hentede kartdata og krever ikke et nytt nettoppkall for hvert trykk.

## Mine mål

«Henter mål …» var koblet til både global opptatt-status og bakgrunnssynkronisering. Derfor kunne skjermen vise en pågående målforespørsel når det egentlig var annet arbeid. Målsøket bruker nå egen status, uavhengig av bakgrunnssynkronisering og målsjekk.

Målforslag bruker lagrede kartdata først. Mangler aktuelle mål, hentes lokale stier og steder; målsøket venter ikke på en nedlasting av hele kommunens gatekart. Stedsnavnet fryses med målet og geografisk oppslag har egen kort tidsgrense. Eksisterende aktive mål endres ikke.

Hele søket har en tidsgrense på 30 sekunder, synlig «Avbryt søket» og feilmelding ved problemer. Tidsgrensen gjelder også om native GPS/geokoding eller fetch ikke svarer på abort. Lukking av skjermen avbryter søket. Resultater lagres bare fra gjeldende, fullførte forespørsel, så sene svar etter avbryt ikke kan overskrive nyere forslag. Implementasjonen er testet med React Natives faktiske AbortController-polyfill, som mangler `signal.reason`.

Aktive mål vises først. Henteknappen for de syv byfjellene skjules når et gyldig Bergen-mål allerede finnes blant aktive mål eller forslag. Målet vises én gang.

## Kontroll

TypeScript og 191 app-/komponenttester består. Nye tester kontrollerer stiutvalg, nærmeste treff blant parallelle stier, adskilte stigrener, det faktiske infokortet, valg og kartutsnitt gjennom fullskjerm/minimering, abort, timeout, gamle svar etter nytt søk og målskjermens status/duplikater.

Android-bygget og seks native tester består. APK-en er kontrollert for versjon, nye UI-tekster, Hermes, samme signatur som 0.3.15 og fravær av mikrofontillatelse. Kamerarettingen fra 0.3.15 er fortsatt verifisert i den kompilerte DEX-koden. Kartets native gjengivelse og treffområde må fortsatt prøves på fysisk telefon; komponenttestene erstatter ikke det. Ingen nye kartleverandører eller tillatelser er lagt til.

APK: 45997272 byte. SHA-256: `8e66f3b06f654ee00b6c7e643ec913d0f201555caf9622e958e6f01cfd357c95`.

# Herebound-figur: første fungerende utgave

Implementert i 0.3.0. Plattformen eier figuren, utseendet, XP, nivå, kosmetiske eiendeler og hvilke gjenstander som bæres. ULTIMA X gir deklarative funn og belønninger gjennom SDK-et.

## Kontrakt og lagring

- `Character.appearance`: kropp, hudtone, hår og hårstil. Rendererens validerte valg kan utvides senere. Klientens forhåndsvisning endrer ikke lagringen før brukeren lagrer.
- `Character.equipment`: gjenstands-ID per hånd, rygg og amulett. Gjenstanden må være eid, støtte plassen og oppfylle nivåkravet. Det opprettes ingen ekstra kopi av inventaret. Salg/forbruk av siste eksemplar tar det automatisk av.
- `Skin`: navn, beskrivelse, støttet visuelt uttrykk, nivåkrav og kilde (`level`, `shop`, `adventure`). Kosmetikk veier ikke og gir ikke skjulte egenskapsbonuser. `ownedSkins` og aktivt `skin` er separate; forhåndsvisning krever ikke eierskap, bruk gjør det.
- Spill definerer skins i eget navnerom, plattforminnhold i `herebound:`. Lagringen beholder nødvendige beskrivelser og visuelle referanser også når opphavsspillet ikke er lastet.
- `interaction.skinReward` gir en autorisert eventyrbelønning i samme transaksjon som kostnad, journal og XP. Nivåbelønninger gis ved terskelen; kjøp trekker én felles myntsaldo. Idempotens og lagring før bekreftelse gjelder også påkledning og skins.
- `xpClaims` identifiserer første oppdagelse/handling per spill og møte. En figur tjener ikke XP på samme møte igjen ved å veksle mellom felt og simulator. Lokal prøvefigur og valuta er fortsatt ikke serververifisert.

## Progresjon

Samlet XP krever ikke omregning mellom spill. Nivå L begynner ved `15 × (L−1) × L` XP, med tak på nivå 50. Tersklene i denne prøven er 0, 30, 90, 180, 300 … XP. Belønningstakten er foreløpig, og skal vurderes ut fra spilltestene. Grunnegenskaper og bæreevne endres ikke automatisk av nivå ennå.

Oppdatering fra 0.2.0 bevarer XP, mynter, inventar, hjelpere og oppdagelser. Nivå avledes fra eksisterende XP. Avsluttede historiedeler gir sine nye kosmetiske belønninger uten ny runde; dette tildeler ikke gammel XP på nytt.

## Første innhold

Vandrer er basisantrekket. Skogvokter gis på nivå 2. Stormvandrer åpnes på nivå 2 og koster 8 spillmynter. Lyktbærer er en eventyrpremie fra den første lykten. ULTIMA X har et nytt tursekkfunn, en kjøpbar stav og en vunnet lyktamulett, alle synlige på figuren.

Den visuelle utgaven er en animerbar, lagdelt SVG-illustrasjon. Den kan prøves og leses på dagens telefoner uten nye grafikkavhengigheter. Den erstatter ikke planen om en gjennomarbeidet 3D-figur med felles skjelett, drakter og førstepersonshender. Den kommende rendereren skal bruke de samme eierskaps- og utstyrsdataene; den skal ikke lage ny XP, figur eller inventar.

Før kommersiell økonomi: serverautoritativ XP, skapernes belønningsrammer, verifiserte kjøpskvitteringer, gjenoppretting og tilbakebetaling. Ingen skjult klientsnarvei for å tildele betalte skins. Disse tjenestene er ikke levert i den lokale prøven.

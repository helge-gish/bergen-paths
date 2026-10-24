# Utendørs spillarena

Eget produkt under oppstart: appen finner spillerens posisjon og tilbyr lokale spill innen konkrete områder med maksimalt 5 km radius. Andre utviklere skal senere kunne lage spill på arenaen. Fløyen er den første eventyrpakken, ikke hele appen. [Fortelling og spillplan](../../docs/product/floeyen-story.md).

Første kapittel: **Lyktene under Fløyen**. Solo som første spillbare fortelling, men flerspiller ligger i datamodellen fra starten. Konto, serverinventar og personlige/lagdelte/verdensdelte tilstander må være adskilt. Ingen ferdig live-server eller godkjente geografiske møtepunkter finnes ennå.

Første spill er et Ultima-inspirert rollespill. Rollefiguren og inventaret er varige på tvers av rollespillseriens eventyrpakker. Brukeren ønsker figuren med inn i ulike gameplays. Fullt inventar med lokale bruksområder og et valgt aktivt utrustningssett er foreslått til utprøving. Alle krefter og alt utstyr beholdes. Lokal oppdragsprogresjon og verdenshendelser er avgrenset til hvert spill. `world.ts` er en separat simulering av lagets oppdrag/handel, ikke kontosystemet eller en geografisk live-server. `scenario.ts` beskriver første innholdspakke og en første progresjonsregel. `catalogue.ts` skiller områdeoppdagelse fra fysisk ankomst til et godkjent møtested.

[Fast Ultima-inspirert gameplaykjerne](../../docs/product/ultima-gameplay.md). Arbeidstittel på serien er ULTIMA XXVII. Endelig navn er ikke bestemt.

[Arenaplan og utviklerformat](../../docs/product/outdoor-arena.md). `manifest.ts` kontrollerer spillområdets radius og at alle deklarerte møteområder ligger innenfor. Utviklerverktøy, publiseringsflyt og en komplett SDK er ikke implementert.

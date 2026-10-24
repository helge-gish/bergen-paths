# Stedbasert rollespillplattform

Eget produkt under oppstart: appen finner spillerens posisjon og tilbyr lokale spill. Fløyen er den første eventyrpakken, ikke hele appen. [Fortelling og spillplan](../../docs/product/floeyen-story.md).

Første kapittel: **Lyktene under Fløyen**. Solo som første spillbare fortelling, men flerspiller ligger i datamodellen fra starten. Konto, serverinventar og personlige/lagdelte/verdensdelte tilstander må være adskilt. Ingen ferdig live-server eller godkjente geografiske møtepunkter finnes ennå.

Én varig figur og ett inventar på tvers av eventyrpakkene. Alle krefter og alt utstyr beholdes. Lokal oppdragsprogresjon og verdenshendelser er avgrenset til hvert spill. `world.ts` er en separat simulering av lagets oppdrag/handel, ikke kontosystemet eller en geografisk live-server. `scenario.ts` beskriver første innholdspakke og en første progresjonsregel. `catalogue.ts` skiller områdeoppdagelse fra fysisk ankomst til et godkjent møtested.

[Fast Ultima-inspirert gameplaykjerne](../../docs/product/ultima-gameplay.md). Arbeidstittel på serien er ULTIMA XXVII. Endelig navn er ikke bestemt.

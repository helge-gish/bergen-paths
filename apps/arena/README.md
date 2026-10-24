# Utendørs spillarena

**Neste leveranse:** én selvstendig ULTIMA X-testapp med minimalt skall, lokal figur/lagring og kart/AR. Gameplayet itereres før vi generaliserer SDK-et eller bygger backend/MCP. [Gjeldende avgrensning](../../docs/product/ultima-v-world.md#førsteprioritet-test-gameplayet-før-vi-generaliserer).

[Gjeldende produktplan: ULTIMA X ved Fløyvarden, felles SDK og AI-forfatting via MCP](../../docs/product/ultima-v-world.md). Katalogprototypen bruker nå Fløyvarden som senter og 5000 meter radius. `region.ts` vurderer GPS-basert områdestatus; spillvelger, mobilintegrasjon og MCP-server er fortsatt planlagt.

[Konkret plan for første spilltest på Fløyen](../../docs/product/floeyen-first-test.md): ett komplett kapittel, først som spillbar simulator og deretter som geografisk felttest.

Eget produkt under oppstart: appen finner spillerens posisjon og tilbyr lokale spill innen konkrete områder med maksimalt 5 km radius. Andre utviklere skal senere kunne lage spill på arenaen. Fløyen er den første eventyrpakken, ikke hele appen. [Fortelling og spillplan](../../docs/product/floeyen-story.md).

Første kapittel: **Lyktene under Fløyen**. Solo som første spillbare fortelling, men flerspiller ligger i datamodellen fra starten. Konto, serverinventar og personlige/lagdelte/verdensdelte tilstander må være adskilt. Ingen ferdig live-server eller godkjente geografiske møtepunkter finnes ennå.

Første spill er et Ultima-inspirert rollespill. Rollefiguren og inventaret er varige på tvers av rollespillseriens eventyrpakker. Brukeren ønsker figuren med inn i ulike gameplays. Fullt inventar med lokale bruksområder og et valgt aktivt utrustningssett er valgt retning, med detaljer til utprøving. Alle krefter og alt utstyr beholdes. Lokal oppdragsprogresjon og verdenshendelser er avgrenset til hvert spill. `world.ts` er en separat simulering av lagets oppdrag/handel, ikke kontosystemet eller en geografisk live-server. `scenario.ts` beskriver første innholdspakke og en første progresjonsregel. `catalogue.ts` skiller områdeoppdagelse fra fysisk ankomst til et godkjent møtested.

[Fast Ultima-inspirert gameplaykjerne](../../docs/product/ultima-gameplay.md). Første spill heter ULTIMA X i prototypen. Plattformens navn er ikke bestemt.

[Arenaplan og utviklerformat](../../docs/product/outdoor-arena.md). `manifest.ts` kontrollerer spillområdets radius og at alle deklarerte møteområder ligger innenfor. Utviklerverktøy, publiseringsflyt og en komplett SDK er ikke implementert.

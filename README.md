# Herebound 0.1.1 — stabil og direkte prøvestart

Installer som **Oppdater** over Herebound 0.1.0. Samme app-id, signering og lagreformat; figur, sekk, hjelper og spillfremgang beholdes.

- **Start prøve** åpner spillet direkte ved Meyermarken, uten GPS eller mellomsteg. **Fortsett prøve** bruker lagret prøveposisjon.
- Retter en klokkerace der simulatorens tidsstempel kunne bli nyere enn kontrollklokken. Det kunne skjule spillkortet og deaktivere starten ved en timeroppdatering.
- Prøven kan startes mens GPS-forespørselen venter. Et forsinket GPS-svar kan ikke bytte tilbake etterpå.
- Startstedets detaljer vises på en egen skjerm og forsvinner ikke når posisjonsstatus oppdateres.

Selve eventyret kjører fortsatt i simulatoren. Fysisk spilling via GPS og AR er ikke aktivert; du trenger ikke gå ut for å teste denne utgaven. Spillområdet er fortsatt knyttet til Fløyvarden, med Meyermarken som teststart.

Kontroll: tre nye UI-regresjonstester for direkte start, skiftende klokke, bakgrunn/gjenåpning og forsinket GPS-svar; SDK-tester; hele testpakken; TypeScript; nettlesergjennomgang av start, samtale, handel, hjelper, sekk og omstart. Ingen fysisk Pixel-test i utviklingsmiljøet.

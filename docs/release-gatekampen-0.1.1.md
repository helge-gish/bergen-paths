# Gatekampen 0.1.1 — kandidat, venter på e-post og gatekatalog

Dette er en bygget APK med tilkobling til Gatekampens Supabase-prosjekt. **Venneprøven er ikke klar ennå.** Ikke bruk denne som bekreftelse på at innlogging og konkurranser virker fra ende til ende.

Database, private grupper, invitasjoner og GPS-kontroll er publisert. E-postmal/avsender og gjennomgåtte konkurransegater mangler. Det er ennå ingen publiserte konkurranseområder. Full HTTP/Auth/Edge-test og test med to telefoner gjenstår.

## Endret

- Offentlig klientkonfigurasjon for Gatekampens egen Supabase-base.
- Lagret visningsnavn hentes inn, og navn kreves før gruppestart. Bare gruppeeieren får invitasjonsknapp.
- Kodeinnlogging har ventetid før ny kode og rydder kodefeltet ved adresseendring.
- Utløpt innlogging kan gjenopprettes. Samtidige forespørsler deler tokenfornyelse, og utlogging rydder lokal innlogging selv uten nett.
- Feil ved lasting av en annen gruppe endrer ikke hvilken gruppe opplasting og invitasjon gjelder.

## Kontrollert

313 automatiserte tester og TypeScript bestod. APK-en er bygget og kontrollert: `no.gatekampen.app`, versjon `0.1.1`, kode `2`, arm64, samme signeringssertifikat som 0.1.0. Kamera og mikrofon er fortsatt ikke med. Kan installeres som oppdatering uten å slette lokal gatesamling.

Auth-/gruppetestene simulerer HTTP og native lagring. De beviser ikke e-postlevering, live JWT/Edge-trafikk eller telefonens GPS. Ingen nye e-poster er sendt eller testkontoer opprettet av dette bygget.

APK SHA-256: `e4443d573dcb97669f6ed8859f45dc073ad30395a0c03c456d09094e6d9d6a70`.

[Oppsett og resterende steg](product/gatekampen-supabase-setup.md).

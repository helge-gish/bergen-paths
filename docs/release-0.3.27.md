# Tråkk 0.3.27 — første utgave med lokale ARCore-bakkeankre

Android testutgave, versionCode 32. Installer som oppdatering uten å avinstallere.

## Bruk

1. Åpne Utforsk → Kamera · AR. Hvis AR-tjenesten mangler eller må oppdateres, bruk «Aktiver bakkeankre» i statusområdet. Det åpner Googles vanlige installasjonsdialog. Vanlig kameravisning kan fortsatt brukes uten ARCore.
2. Velg en sti, gate, trapp eller et lagret strekk, og trykk «Vis retning i kamera» i infopanelet.
3. Beveg kameraet rolig over bakken foran deg. Godt lys og synlige detaljer hjelper. Når underlaget spores, vises en turkis retningspil med ring i perspektiv og status «Pil festet».

## Hva som er implementert

- ARCore 1.51.0 bruker kamerabevegelse og målte, oppovervendte horisontale flater. En lokal `Anchor` plasseres ved et faktisk treff innenfor flatepolygonet; ingen antatt bakkehøyde, instant placement eller skjermkoordinat brukes som bakkeanker.
- Pilen står lokalt i underlaget mens kameraet beveger seg. Retningen mot valgt sted beregnes én gang ved plassering fra kamerastilling og fersk kompassretning. Retningen er fortsatt omtrentlig.
- Treff må være 0,5–4 meter unna, 0,4–2,5 meter under kameraet og på en målt flate med utstrekning minst 0,5 meter i begge akser. Dette er en kontroll av et mulig underlag, ikke semantisk gjenkjenning av bakke.
- Ankeret fjernes ved mistet sporing, ugyldig/gammel GPS eller kompassretning, endret mål, mer enn 6 meters avstand eller 30 sekunders alder. Nytt anker krever et nytt godkjent flatetreff. Fullskjerm/minimering starter en ny kamerasession og søker underlaget på nytt.
- Egen TextureView/EGL-visning tegner kamerabilde og 3D-pil i samme native renderløp. ARCore og ankeroppdateringer går på én serialisert arbeidstråd. Kun statusendringer sendes til JavaScript, og native-koden håndhever målingenes utløp selv om JS skulle stoppe opp.
- Én ARCore-kameraeier på tvers av kameravisninger. Session, ankere og EGL frigjøres ved bakgrunn, lukking, fanebytte og kamerafeil. AR-kameraet frigjøres før feilstatus tillater reservekameraet å åpne.
- Underlagssøk, lite lys og ustabil sporing får egne meldinger. Dagens GPS-/kompassetiketter er tilgjengelige under søk. Ved manglende støtte eller oppstartsfeil brukes vanlig kameravisning. Google Play-tjenester for AR installeres bare etter trykk på aktiveringsknappen.
- ARCore er valgfritt i Android-manifestet. Ingen Google Cloud-konto eller API-nøkkel kreves for denne lokale utgaven. Appen tar ikke opp eller lagrer kamerabilder.

## Avgrensning

Dette er **lokal festing i et målt underlag**, ikke geografisk forankring ved selve stien. Pilen ligger i nærheten av brukeren og peker i retning av målet; den beskriver ikke en gangbar rute eller anbefaling om hvor man kan gå. GPS, kompass og kartdata begrenser fortsatt retningspresisjonen. Pilen kan ikke gjenopprettes på samme geografiske sted etter en ny session.

Geospatial/VPS, geografiske terrengankre, dybdebasert okklusjon og rute på bakken er ikke aktivert. Presis plassering ved en bestemt sti krever Google Cloud-oppsett, målt VPS-/lokaliseringskvalitet og kontroll av selve kartgeometrien.

## Kontroll

222 app-/komponenttester og TypeScript-kontroll består. Testene dekker valg av kameramotor, reservekamera, installasjon uten automatisk dialog, sent svar etter lukking, gamle sensormålinger, underlagsstatus og tilbakefall til nærhetsliste. Native tester dekker AR-verdensaksenes retning, vertikal telefon, underlagsgrenser, guidefrist og utløpte/fjerne ankere.

Android-bygget og alle 14 native enhetstester består. ARCore-biblioteket, modulregistreringen, nye native klasser, valgfritt AR-manifest, versjon, Hermes-bundle og samme APK-signatur er kontrollert. Ingen fysisk Pixel 6a er tilkoblet. Faktisk kamerapreview, flatedeteksjon, perspektiv og ankerstabilitet må feltprøves; dette er en testutgave.

APK: 46025954 byte. SHA-256: `8a702aff5fedf90ef3e72414692fe1297955136218857f1291a6721262c979b3`.

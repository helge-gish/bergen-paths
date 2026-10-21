# Tråkkvennen og lokal spillmodus

Retning fra brukerens ønsker, 21. oktober 2026. Dette er produktretning for v2, ikke funksjoner som er koblet til en nettjeneste i 0.3.17.

## Figuren

Tråkkvennen er en liten, vennlig hverdagsvandrer med rund silhuett, regnjakke og solide tursko. Gjenkjennelige farger er terrakotta, mosegrønt og varm krem. Figuren skal passe både en kort tur i nabolaget og en fjelltur. Fantasyportrettet og runetitlene er erstattet i 0.3.17.

Førsteutgaven har to illustrerte varianter, rolig bevegelse, eksisterende nivå/XP og en synlig utstyrssamling. Mann/dame-valget bruker den eksisterende lokale innstillingen. Illustrasjonen er foreløpig én figurflate per variant: utstyret kan ikke tas på i denne utgaven.

Neste steg er en faktisk figurbygger med separate lag for kroppsform, ansikt/hår, klær og utstyr. Utstyr har stabile identiteter og plasser: `feet`, `head`, `back`, `hand`, `badge` i `src/domain/companion.ts`. Et fremtidig lagret antrekk skal peke på disse identitetene, ikke på norske visningstitler. Nye fargevalg og kroppsdeler skal kunne legges til uten å flytte eksisterende XP eller prestasjoner. Godkjent kunst må deles i egne lag med felles festepunkter før påkledning kan implementeres ordentlig.

Utstyr låses opp av faktisk opptjent fremgang. Tursko er grunnutstyr; caps, ryggsekk, turstav og merke følger nivåene 2, 3, 5 og 8. Samlingen er nå synlig; v2 lar brukeren velge blant tilgjengelige deler.

## Nærområdet som spillflate

«Gater fullført» er et sentralt mål på utforsking. Telleren må alltid oppgi at den gjelder kartlagte gater innen valgt radius. Ufullstendig datagrunnlag, pågående sjekk og delvis gått må være tydelig. Endret radius eller posisjon endrer utvalget. Historiske turer bidrar uten at en utfordring måtte være aktivert først.

Utfordringer kan bygge på dette: fullfør en påbegynt gate, besøk tre nye steder, eller utforsk et bestemt område sammen. Sammenlignbare utfordringer trenger en felles, versjonert områdedefinisjon; to brukeres bevegelige «nærområde» er ikke automatisk samme konkurranse.

## Møte andre på tur

Foreslått inngang er en frivillig spillmodus. Brukeren velger å være synlig for andre som går tur i området og kan se tråkkvenner, foreslå en utfordring og godta en invitasjon. Delte visninger bør vise et omtrentlig område og valgt figur, uten automatisk publisering av hele GPS-sporet. Synlighet skal ha en tydelig av-knapp og utløpe når økten avsluttes.

En første sosial utgave trenger konto/identitet, en nettjeneste for tilstedeværelse og invitasjoner, felles utfordringsdefinisjoner og en enkel måte å blokkere eller rapportere andre på. Ingen av disse er simulert med falske personer i dagens app. Registrering og lokal turlogg skal fortsatt kunne brukes uten spillmodus eller nett.

En passende rekkefølge er: figurbygger → lokale solo-utfordringer med stabile regler → inviter en kjent turvenn → frivillig oppdagelse av andre i området.

# Inventarul operațiilor către Orgo

Stare examinată: 2026-11-02. „Contract de verificat” înseamnă muncă necesară în
această livrare, nu eliminarea operației din obiectiv. O operație cu echivalent
dar refuzată de tenant trebuie afișată blocată, cu motiv și posibilitate de reluare.

| Operația Resurse | Echivalent / contract Orgo | Stare și condiții |
| --- | --- | --- |
| Creare membru de către admin, aprobare înscriere publică | `POST /api/v1/member-register-by-admin`, apoi asociere ID | Documentat; probă de contract necesară. Verificare duplicate, local center fix și recuperare după timeout |
| Asociere cont existent | `GET /users/{id}` și legătură locală | Nu creează un cont nou și nu mută automat un cont din alt centru |
| ID/card negăsit local sau centru aparent greșit | Citire punctuală identitate/afiliere Orgo | Verifică înainte de refuz și reevaluează autorizarea/eligibilitatea; eroarea remote nu înseamnă inexistență |
| Deschidere/reîncărcare aplicație autentificată | Registru paginat și reconciliere inbound | Job în fundal per centru, comun încărcărilor simultane; navigarea SPA nu repetă importul complet |
| Nume și prenume | `PATCH /users/{id}`: firstName, lastName, middleName | Formularul trebuie să distingă câmpurile; nu împărțim automat numele complet |
| Data nașterii, email, telefon, câmpuri compatibile | `PATCH /users/{id}` | Extindere/adaptare outbox existent; emailul poate avea contract separat |
| Fotografie | Media upload și asociere profil | Cale existentă; verificare drepturi, conținut și recitire |
| Câmpuri personalizate și clasă | Definiții tenant + valori custom | Mapare explicită după ID și tip; clasa 0/pregătitoare nu este absență. Fără mapare sigură, clasă păstrată local și diferență vizibilă |
| Retragere și reactivare | Lifecycle/status Orgo și efectele asupra rolurilor | Codul pentru retragere trebuie confirmat; nu confundăm INACTIVE, suspendare și demisie. Reactivarea nu redeschide roluri istorice |
| Ramură / tip de membru | userType și roluri de beneficiar | Mapare explicită; responsabilitatea de adult nu schimbă automat categoria principală |
| Acordare rol de lider, șef, ajutor, consiliu/scouter | `POST /user_roles`, `PATCH /user_roles/{id}` și roluri de unitate/centru | Lider 1 + unitate 137 confirmat în producție. Celelalte mapări se verifică distinct |
| Încheiere / expirare rol, înlocuire șef | Încheiere UserRole cu data efectivă | Păstrează istoric și roluri neadministrate de aplicație; joburile de expirare emit și ele operații |
| Transfer membru, operații în masă | Tip / roluri în unități mapate | Numai echivalentele reale. Cluj/Florești nu implică automat mutarea în alt centru Orgo |
| Creare, redenumire, arhivare unitate/subunitate | Unit și tip structural Orgo | Harta subunităților se verifică; fără publicarea automată a oricărui grup local drept patrulă |
| Progresie anuală | Actualizări clasă, tip și roluri de unitate | Refolosește aceleași adaptoare ca editarea manuală; păstrează excepțiile locale |
| Schimbare plan de cotizație | feeTenantProductPrice | Outbox existent; recuperare a operațiilor permission-required cu recitire |
| Confirmare cotizație națională | fee_payments + istoric exact perioadă | Flux financiar existent, actor și confirmare explicită; fără retrimiterea plăților confirmate sau cu rezultat incert |
| Creare/editare/publicare/anulare activitate | Event, inclusiv legătura orgoEventId/IRI existentă | Adaptor nou, contract și drepturi tenant de verificat; draft local nu devine eveniment public prematur |
| Înscriere/aprobare/retragere/participare la activitate | Event attendee/registration | Mapare stări și identități; dependentă de evenimentul și membrul Orgo confirmat |
| Plăți de activitate și restituiri | Plată/attendee numai dacă există echivalență contractuală reală | Nu inițiază o a doua debitare ori restituire și nu convertește cotizații în taxe de eveniment |
| Acorduri și documente | Atașament/contract numai cu aceeași semnificație și acces | Copiile semnate și istoricul rămân imuabile; nu declarăm aprobare de adeziune din simpla aprobare a contului |
| Contacte părinte/tutore și legătură cu copilul | Date locale reutilizabile | Excluse din writeback conform cerinței utilizatorului; acces verificat la precompletare |
| Notițe interne, date medicale fără mapare echivalentă | Nicio publicare implicită | Păstrează vizibilitatea promisă de fluxul local |
| Roluri tehnice admin/super_admin, configurări locale | Nu sunt roluri naționale de cercetășie | Fără grant Orgo derivat dintr-un privilegiu tehnic local |
| Inventar, bucătărie, extrase, Keez, documente contabile | Niciun contract echivalent confirmat în inventarul curent | Verificare pe fiecare mutație; fără transformarea lor arbitrară în plăți/evenimente Orgo |

## Dovezi și surse

- Test producție 2026-11-02: PATCH profil cu valoare identică -> 200; rol Lider
  la Temerari pentru 39717, 2507, 198 -> 200, recitire confirmată. Cele trei
  operații locale au fost marcate synced cu audit; nu trebuie retrimise.
- [Creare membru de către admin](https://orgo.space/docs/api-reference/user/register-a-member-as-admin)
- [Actualizare profil administrativ](https://orgo.space/docs/api-reference/user/update-a-user-as-admin)
- [Actualizare roluri](https://orgo.space/docs/api-reference/user/update-user-roles)
- [Creare eveniment](https://orgo.space/docs/api-reference/event/create-an-event)
- [Aprobarea înscrierilor](https://orgo.space/guides/how-to-approve-membership-applications/)

Documentația publică indică operațiile; nu dovedește drepturile tokenului în
tenant. Aprobarea adeziunii și activarea contului sunt două stări distincte.

## Acoperirea implementării

| Traseu implementat | Adaptor / probe |
| --- | --- |
| MembersController: editare, bulk, status, roluri, transfer; MembersWorker: progresie/expirare | MembersService.queue → MemberOrgoService; teste members.http/orgo.service |
| AdmissionsController: depunere/creare/review; `/register`, `/applications` | AdmissionsService → același dispatcher; admission.rules/admissions.service și Playwright admissions |
| Activities / Registration / structuri: toate mutațiile persistate | Trigger Migration20261102000100 → OrgoObjectsService; teste PostgreSQL și orgo-objects.service |
| Membership guest lookup, my obligations și checkout; publicPage înscriere activitate | verifyIdentity exact → reevaluare locală; teste orgo.service și membership |
| AppShell onMount → orgo-sync proxy → bootstrap | Lease/backoff MemberSettings; teste refresh și Playwright SPA/reload |
| Istoric local-only / blocat | `/admin/orgo-sync`, previzualizare versionată, retry auditat; fără replay automat la migrare |
| Planuri/cotizații naționale | Transporturile existente păstrate; testele financiare existente incluse în suita API |
| Inventar/bucătărie/Keez/documente/consimțăminte/finanțe de activitate | Evidențe locale, fără contract național echivalent verificat; nu emit bani sau aprobări naționale |

Adaptoarele sunt implementate și testate cu date sintetice; drepturile și
mapările neconfirmate în tenant rămân explicit blocate. Starea reală de
activare și recuperare este documentată în `docs/orgo-sync-and-registration.md`.
Nu se declară sincronizare completă în producție înainte de lansare și readback.

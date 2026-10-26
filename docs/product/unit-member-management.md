# Unități și membri

Implementarea este accesibilă la `/units`, separat de administrarea financiară.
Fișele membrilor nu necesită existența unui cont local pentru fiecare beneficiar.
Contul autentificat este identificat prin legătura Orgo verificată; părintele
poate folosi contul copilului. Auditul identifică acel cont, nu persoana care
a folosit efectiv dispozitivul.

## Organizare și acces

Consiliul creează unități și numește șefi. Șefii creează subgrupe, repartizează
adulți și gestionează toți membrii unității. Un lider vede toată unitatea,
inclusiv fișele medicale, notițele și rezumatul cotizațiilor, dar modifică doar
grupa proprie sau colectivul comun la care este repartizat. Ajutoarele au acces
de bază în grupa proprie; șeful acordă separat modificarea, cotizațiile și
accesul la date medicale/notițe. Datele medicale și notițele nu apar implicit în
răspunsurile trimise unui ajutor fără aceste drepturi.

Un beneficiar are o unitate și cel mult o subgrupă curentă. Responsabilitățile
adulților sunt independente și pot acoperi mai multe unități. Seniorii pot fi
ajutoare, dar nu lideri. Rolurile de lider și șef necesită o dată a promisiunii
și verificarea vârstei adulte. Rolul de scouter se atribuie explicit.

Mandatul în consiliu acordă `admin`, fără a acorda `super_admin`. Încheierea
mandatului elimină doar accesul derivat, nu rolurile acordate independent.
Retragerea globală suspendă toate drepturile; la reactivare privilegiile vechi
nu reapar automat. Șeful destinației vede transferurile în panoul unităților.

## Fișa membrului

Câmpurile reutilizabile inițiale sunt: email și telefon, numele și contactele
părintelui, contactul de urgență, problemele medicale, alergiile, medicația și
regimul alimentar. Modificările concurente sunt respinse dacă fișa a fost
actualizată între timp. Numele și data nașterii pot fi corectate de șef sau
consiliu. Notițele sunt adăugate cu autor și dată și rămân exclusiv locale.

Formularele de înscriere la activități sunt un flux distinct, care va folosi
aceste date și va solicita reconfirmarea informațiilor medicale și a contactelor
de urgență. Contractul de integrare și instantaneele viitoarelor înscrieri sunt
descrise în propunerea OpenSpec. Această schimbare nu livrează un constructor
de formulare de eveniment. Acordurile parentale PDF continuă să fie generate
și semnate separat; o actualizare a fișei nu înlocuiește și nu modifică un PDF.

## Retragere și revenire

Liderul poate aplica imediat „Retras din activitate” în aria sa de gestiune.
Se încheie toate implicările persoanei. Nu se șterg plăți sau istoricul.
Cotizațiile nu mai sunt urmărite ca restanțe și nu pot fi inițiate plăți noi.
Plățile deja în curs sunt semnalate pentru verificare financiară.

La revenirea inițiată local se aleg unitatea/grupa; reactivarea confirmată în Orgo păstrează apartenența locală cunoscută, iar lipsurile sunt trimise la verificare. Cotizația urmărită este cea pentru
anul curent; plățile existente în acel an sunt păstrate, iar anii anteriori nu
devin restanțe. Dacă nu există un plan anterior verificat sau o perioadă curentă
inițializată, configurarea cotizației se face prin fluxul financiar existent.
Nu se presupune automat un plan pentru un membru nou.

## Actualizarea anuală

Un worker verifică independent de paginile deschise tranziția din 1 septembrie,
în `Europe/Bucharest`. Activarea se face de administrator după verificarea
datelor inițiale. Anul cercetășesc începe în octombrie; septembrie este etapa
de pregătire. Clasele și apartenențele avansează o singură dată pe an.

Grupele de temerari rămân aceleași comunități cu aceiași adulți când avansează
clasa. După clasa a VIII-a copiii intră în colectivul exploratorilor; grupa se
arhivează după rezolvarea tuturor membrilor, iar adulții se repartizează separat.
Seniorii care au împlinit 24 de ani la 1 septembrie devin voluntari adulți fără
unitate, iar responsabilitățile lor de ajutor de unitate se încheie.

O excepție individuală oprește progresia pentru anul indicat. Clasele pot fi
corectate manual oricând; această corectură stabilește clasa actuală a anului
curent. Datele lipsă, destinațiile ambigue și mai mulți ani neprocesați apar
pentru verificare, fără a ghici clasa din vârstă. Păstrați nume stabile pentru
grupe, independente de clasa curentă.

## Integrarea Orgo și limitele actuale

Configurația se păstrează exclusiv pe server:

| Variabilă                    | Utilizare                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------ |
| `ORGO_API_TOKEN`             | Tokenul server-to-server; nu este expus browserului                            |
| `ORGO_LOCAL_CENTER_ID`       | Centrul pentru toate verificările de acces                                     |
| `ORGO_OAUTH_BASE_URL`        | Hostul tenantului, obligatoriu HTTPS                                           |
| `ORGO_MEMBER_WRITES_ENABLED` | Implicit dezactivat; `true` numai după verificarea contractului și drepturilor |
| `ORGO_ACTIVE_STATUS`         | Valoarea Orgo confirmată pentru statusul activ                                 |
| `ORGO_WITHDRAWN_STATUS`      | Valoarea Orgo confirmată pentru retragerea din activitate                      |

Pagina `/units/orgo` citește registrul paginat și structura prin `Api-Token`.
Registrul principal include membrii activi, suspendați, inactivi și retrași,
cu aceeași căutare, filtrare după status și paginare. Nu există un tabel separat
pentru istoricul inactivilor. Fiecare deschidere a paginii afișează datele salvate
și pornește o actualizare Orgo, cu progres, ultima reușită și reîncercare vizibile.
Actualizarea citește toate paginile și fișele înainte de aplicare, descoperă
identități noi și reconciliază statusurile. Lipsa unei persoane din răspuns nu
înseamnă retragere. Identitățile provizorii ambigue nu sunt unite după nume.
Patrulele sunt excluse după tipul structural Orgo (`Patrula` / `Patrulă`),
împreună cu eventualii descendenți. Numele unei unități nu este folosit pentru
această clasificare. Grupele locale rămân configurabile independent de Orgo.
Importul identităților cere previzualizare și confirmare. Clasele, grupele și
responsabilitățile nu sunt inventate din vârstă sau numele rolurilor. Un status
Orgo necunoscut intră în verificare, nu este interpretat automat ca retragere.
Un ID Orgo existent poate fi asociat explicit unei fișe provizorii, după
verificarea centrului și a unicității. Identitățile provizorii nu intră în
checkoutul bazat pe ID Orgo până la confirmarea asocierii.

Outboxul păstrează intenția împreună cu modificarea locală. Adapterul are suport
pentru verificare și actualizare a contactului email/telefon și a statusului,
cu citire înainte/după scriere, conflict și recuperare după răspuns incert.
Reverificarea unei versiuni vechi folosește datele locale curente. La un conflict real pe același câmp, valoarea Orgo este acceptată automat și intenția locală este înlocuită cu audit. O intenție locală rămâne în așteptare dacă baza Orgo nu s-a schimbat. Câmpurile personalizate se reconciliază individual. Nu există schimbare automată la tokenul utilizatorului.

**Integrare încă de finalizat:** crearea automată de membri în Orgo, maparea și
scrierea unităților/subgrupelor/rolurilor, numelui, datei nașterii și clasei,
reconcilierea automată completă din Orgo și execuția delegată explicită.
Aceste modificări rămân vizibil nesincronizate; nu sunt marcate ca reușite.
Sunt necesare configurația reală ONCR și un mediu în care contractele de scriere
să poată fi probate. Nu activați scrierile doar pe baza documentației publice.
Datele medicale și contactele extinse rămân locale până la verificarea unor
câmpuri Orgo cu vizibilitate adecvată; notițele rămân permanent locale.

## Instalare și verificare

Aplicați `Migration20261019000200` prin mecanismul existent de migrare înainte
de pornirea noii versiuni. Migrarea este aditivă și nu importă sau modifică
membri reali automat. Activați progresia numai după verificarea manuală a
claselor și grupelor importate. Configurația locală examinată nu conține tokenul
server-to-server sau ID-ul centrului. La pregătirea lansării au fost confirmate
în Secrets Manager configurația de producție și citirea registrelor `/users` și
`/units` cu tokenul server-to-server. Câmpurile `dateBirth`, `phoneNumber`,
`localCenter` și structura paginată corespund adapterului. Statusurile observate
includ `ACTIVE`, `INACTIVE` și `SUSPENDED`; semnificația retragerii trebuie încă
confirmată înainte de mapare. Nu s-au efectuat importuri sau scrieri în Orgo.

Testele acoperă politicile, rutele HTTP, confidențialitatea, transferurile,
retragerile, revenirea fără dublarea obligațiilor, tranzițiile anuale și
adapterul Orgo cu răspunsuri simulate. Testele HTTP folosesc un depozit în
memorie; nu înlocuiesc testarea migrării și a tranzacțiilor pe PostgreSQL.

Verificări efectuate la 19 octombrie 2026: 338 teste API și 28 teste web trecute;
build API și web reușite; verificările TypeScript/Svelte, lintul și formatarea
fișierelor modificate trecute; propunerea OpenSpec validată strict. Generarea
schemei ORM a fost verificată și fără conectare la bază. Workflow-ul
`Verify member management` a aplicat toate migrările pe o bază PostgreSQL 16
temporară și a verificat adăugarea, actualizarea cu controlul versiunii,
transferul, retragerea și reactivarea unui membru cu păstrarea datelor medicale.
Acest test a identificat și prevenit o inserare a outboxului înaintea fișei noi;
identitatea se salvează acum înaintea rândurilor dependente, în aceeași tranzacție.

## Cluj și Florești

Consiliul confirmă încadrarea inițială din Unități și membri → Apartenența la Cluj și Florești. Propunerea folosește numele doar la prima încadrare; ulterior apartenența este explicită. Unitățile și subgrupele aparțin unei structuri. Dacă datele vechi amestecă ambele structuri într-o unitate, se creează întâi unitățile locale separate și se rezolvă repartizările în previzualizare. Membrii inactivi se verifică în tabelul principal, prin filtrul de status.

Un responsabil de structură este un adult verificat, numit de Consiliu din fișa membrului. Nu are nevoie de promisiunea de lider pentru acest mandat. Gestionează membrii, unitățile și șefii propriei structuri și vede cotizațiile și adeziunile; nu primește drepturi financiare. Consiliul aprobă transferurile Cluj/Florești și implicarea adulților în cealaltă structură. Încetarea unei implicări locale nu retrage adultul din toate activitățile.

Temerarii trec anual în aceeași structură. Dacă Florești nu are Exploratori, fișa rămâne în Florești, iar responsabilul și Consiliul văd trecerea de rezolvat manual. Grupele stabile își păstrează identitatea și liderii.

## Adeziuni din extrase bancare

Personalul financiar deschide Adeziuni și plăți din extras din Membri și cotizații sau Încasări și alocări. Înregistrează data, referința unică și suma reală, apoi selectează membrul și destinația. O încasare poate acoperi mai multe persoane și atât adeziune, cât și cotizație. Dacă încasarea există deja, se selectează aceasta; nu se introduce din nou.

Adeziunea se recunoaște o singură dată pe identitatea Orgo, indiferent de anul cotizației sau schimbarea numelui. Sumele parțiale rămân parțiale. Pentru un tarif istoric diferit există o opțiune separată și o justificare obligatorie. Fișa și registrul financiar afișează adeziunea achitată; banii ei nu se adună la cotizație sau la transferul național. Corecțiile anulează alocarea cu motiv, păstrând încasarea. Restituirea se înregistrează după anularea alocărilor afectate.

Plățile online aflate în curs la schimbarea apartenenței sau la înregistrarea unei adeziuni bancare sunt trimise la verificare financiară. Transferurile nu rescriu plățile deja confirmate.


## Extindere Orgo și operații din registru (20 octombrie 2026)

Importul citește fișele detaliate, tipurile și funcțiile active. Previzualizarea Consiliului afișează funcțiile; rolul Lider confirmă promisiunea fără o dată inventată. Patrulele rămân excluse, iar acordarea funcțiilor respectă vârsta, ramura și unitățile importate. Funcțiile importate au proveniență pentru încheierea lor la un import ulterior confirmat; responsabilitățile locale nu sunt șterse automat.

Fișa include informațiile Orgo și fotografia, cu editare a câmpurilor compatibile, upload JPG/PNG/WebP și protejarea datelor suplimentare după aria de acces. Setările de securitate ale contului nu sunt importate în fișa cercetășească. Fișele se verifică la fiecare deschidere a registrului, la cerere și prin verificarea zilnică de rezervă; Orgo câștigă schimbările concurente ale aceluiași câmp. Scrierile folosesc exclusiv tokenul serverului și coada existentă, cu verificare prin recitire. Flagul ORGO_MEMBER_WRITES_ENABLED rămâne controlul operațional pentru scrieri; o limitare remote este vizibilă. Rolurile și progresia fără contract de scriere verificat nu sunt declarate sincronizate.

Registrul permite editarea individuală și în lot a clasei, repartizării și statusului. Selecția tuturor rezultatelor cuprinde toate paginile. Transferul apartenenței la Florești este rezervat Consiliului; încheie repartizarea beneficiarului în vechea unitate și păstrează responsabilitățile adulților. Membrii inactivi apar în tabelul principal și pot fi retrași sau reactivați prin acțiunile autorizate; schimbările de status produc operațiuni către Orgo.

Oricine poate vedea un membru poate consulta situația cotizațiilor sale. Confirmările financiare rămân rezervate rolurilor financiare. Meniul contextual verifică în Orgo partea națională pentru perioada exactă și asociază încasarea bancară locală. Acoperirea națională externă nu este o încasare a centrului și nu poate intra din nou într-un lot național. Soldurile și progresul financiar includ ambele componente, iar disponibilul unei încasări folosește numai fondurile reale.

Verificarea aprobată a tokenului existent, efectuată la 20 octombrie 2026 printr-un singur PATCH gol, a primit HTTP 403. Scrierile Orgo rămân dezactivate; activarea cere un token cu drept de editare. Citirea și importul folosesc tokenul serverului existent.

Istoricul național verificat în Orgo folosește anul 1 octombrie–30 septembrie și poate furniza agregate `paid`/`unpaid` fără câmpul `status`. Perioadele locale existente din septembrie sunt asociate cu același an cercetășesc, fără modificarea obligațiilor sau plăților. Asocierea ambiguă este respinsă; plățile parțiale, în așteptare, scutirile și rambursările nu confirmă o cotizație achitată.

Extinderea a fost instalată și verificată în producție la 20 octombrie 2026: migrarea `Migration20261020000200`, serviciile API/web și protecția accesului la membri și fotografii. Validarea include 391 teste API, 31 teste web și 17 teste în browser.

Definițiile tenantului au fost verificate: rolurile 1/6 sunt pentru unități, iar 18/19 sunt pentru patrule și sunt excluse inclusiv din previzualizarea funcțiilor. Câmpurile publice Alimentație, Alergii și Alte nevoi sunt legate de fișa reutilizabilă, cu etichete pentru opțiunile alimentare și protecția câmpurilor administrative. Corecturile folosesc aceeași bază de reconciliere ca fișa Orgo.


## Sincronizarea automată a registrului (26 octombrie 2026)

Se aplică migrarea aditivă `Migration20261026000100` înaintea noii versiuni.
Aceasta adaugă lease-ul persistent al actualizării și programarea reîncercărilor,
clasifică statusurile istorice cunoscute și marchează operațiunile de organizare
ca locale. Structura, categoria, unitatea/subunitatea, clasa și responsabilitățile
sunt administrate în Resurse; actualizarea nu le suprascrie din Orgo.

Workerul verifică operațiunile la aproximativ cinci secunde. Erorile temporare
și HTTP 429/5xx primesc reîncercare cu întârziere progresivă; răspunsurile incerte
sunt recitite înainte de o nouă scriere. HTTP 401/403 rămâne vizibil ca acces
necesar, cu reverificare rară după activarea scrierilor sau reluare manuală după
corectarea tokenului. Schimbările mai noi nu sunt anulate de răspunsuri vechi.
Numele complet liber necesită editorul separat prenume/nume pentru livrare în
Orgo; corectarea datei nașterii și a contactelor folosește aceleași câmpuri ca
editorul profilului extins, chiar dacă se corectează și clasa în aceeași salvare.

Retragerea încheie implicările la nivelul centrului și păstrează istoricul.
Suspendarea/inactivitatea remote blochează autoritatea; reactivarea nu reînvie
mandate încheiate și nu acordă automat roluri de administrator. Plățile istorice
nu se rescriu și nu se creează restanțe retroactive.

Contractele de scriere sunt încă limitate de accesul real al tokenului. Nu s-au
activat scrieri de producție prin această implementare. `ORGO_ACTIVE_STATUS` și
`ORGO_WITHDRAWN_STATUS` trebuie verificate în tenant; `INACTIVE` nu este ghicit
ca valoare de retragere. Fără actualizări condiționale oferite de Orgo, verificarea
înainte/după PATCH reduce conflictele, dar nu poate garanta atomicitatea unei
modificări remote exact între citire și scriere. Testul PostgreSQL existent din
CI acoperă migrarea și idempotenta actualizării pe o bază temporară.


## Schimbarea tipului cotizației

Personalul financiar poate alege „Schimbă tipul” în registrul financiar sau
„Schimbă tipul cotizației” în situația cotizațiilor din meniul unui membru.
Sunt disponibile Normală, Fam 1, Fam 2, Fam 3 și Socială. Previzualizarea arată
tariful perioadei curente, suma deja achitată și restul; confirmarea cere un motiv.
Nu se modifică perioadele istorice, încasările sau alocările existente.

Plățile în curs, surplusul, acoperirea națională externă prea mare și transferurile
naționale incompatibile blochează confirmarea până la reconciliere. Orice schimbare
a datelor după previzualizare cere o nouă verificare. Tipul și intenția Orgo se
salvează în aceeași tranzacție. Un registru Orgo neschimbat nu anulează o schimbare
locală în așteptare; o schimbare concurentă reală din Orgo are prioritate.

Catalogul Orgo și clientul oficial au fost citite la 26 octombrie 2026:
`feeTenantProductPrice` se trimite ca referință `ProductPrice` prin PATCH pe membru.
Se selectează versiunea curentă din produsul de cotizație al tenantului, cu validarea
intervalului și centrului; ID-urile nu sunt fixate în cod. Schimbarea nu înregistrează
o plată națională și nu activează tokenul de scriere. Starea livrării este afișată
în registru și în jurnalul de sincronizare.


## Tokenul utilizatorului pentru scrierile Orgo

La solicitarea explicită a administratorului, scrierile de membri pot folosi tokenul
OAuth criptat al autorului operațiunii când scrierile serverului sunt dezactivate
sau Orgo răspunde 401/403. Se păstrează autorul din outbox, nu se alege alt utilizator.
Drepturile locale curente și câmpurile protejate se verifică înaintea fiecărui apel.
Orgo verifică separat drepturile tokenului. Validarea centrului, reconcilierea și
recitirea după scriere rămân obligatorii. Un timeout sau 5xx nu schimbă tokenul
pentru o a doua scriere imediată.

Tokenul lipsă/revocat cere reautentificare. Un administrator poate relua explicit
o operațiune cu propriul token; schimbarea autorului și modul de execuție sunt
auditate. successToken SSO nu este folosit ca bearer API. Regula înlocuiește
restricția anterioară server-only; fluxul financiar național rămâne separat.

Cotisation type changes use a compact pencil icon next to the plan label. The operator is not required to supply an explanation; the audit retains the actor, old/new plan and amounts.

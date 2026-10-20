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

La revenire se aleg explicit unitatea/grupa. Cotizația urmărită este cea pentru
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
Membrii cu statusul Orgo `INACTIVE` apar exclusiv în secțiunea separată
„Membri inactivi din Orgo”, închisă inițial, cu căutare și pagini de 25 de nume.
Separarea se aplică atât previzualizării, cât și registrului local, inclusiv
identităților importate anterior. Un membru reactivat explicit local revine în
registrul curent. Statusurile necunoscute și `SUSPENDED` rămân pentru verificare;
inactivitatea istorică nu aplică automat retragerea globală sau modificări financiare.
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
Reverificarea unei versiuni vechi folosește datele locale curente. Pentru un
conflict, administratorul verifică valorile în Orgo și confirmă explicit dacă
păstrează varianta locală. Nu există schimbare automată la tokenul utilizatorului.

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

Consiliul confirmă încadrarea inițială din Unități și membri → Apartenența la Cluj și Florești. Propunerea folosește numele doar la prima încadrare; ulterior apartenența este explicită. Unitățile și subgrupele aparțin unei structuri. Dacă datele vechi amestecă ambele structuri într-o unitate, se creează întâi unitățile locale separate și se rezolvă repartizările în previzualizare. Istoricul inactiv se verifică separat, cu căutare și paginare.

Un responsabil de structură este un adult verificat, numit de Consiliu din fișa membrului. Nu are nevoie de promisiunea de lider pentru acest mandat. Gestionează membrii, unitățile și șefii propriei structuri și vede cotizațiile și adeziunile; nu primește drepturi financiare. Consiliul aprobă transferurile Cluj/Florești și implicarea adulților în cealaltă structură. Încetarea unei implicări locale nu retrage adultul din toate activitățile.

Temerarii trec anual în aceeași structură. Dacă Florești nu are Exploratori, fișa rămâne în Florești, iar responsabilul și Consiliul văd trecerea de rezolvat manual. Grupele stabile își păstrează identitatea și liderii.

## Adeziuni din extrase bancare

Personalul financiar deschide Adeziuni și plăți din extras din Membri și cotizații sau Încasări și alocări. Înregistrează data, referința unică și suma reală, apoi selectează membrul și destinația. O încasare poate acoperi mai multe persoane și atât adeziune, cât și cotizație. Dacă încasarea există deja, se selectează aceasta; nu se introduce din nou.

Adeziunea se recunoaște o singură dată pe identitatea Orgo, indiferent de anul cotizației sau schimbarea numelui. Sumele parțiale rămân parțiale. Pentru un tarif istoric diferit există o opțiune separată și o justificare obligatorie. Fișa și registrul financiar afișează adeziunea achitată; banii ei nu se adună la cotizație sau la transferul național. Corecțiile anulează alocarea cu motiv, păstrând încasarea. Restituirea se înregistrează după anularea alocărilor afectate.

Plățile online aflate în curs la schimbarea apartenenței sau la înregistrarea unei adeziuni bancare sunt trimise la verificare financiară. Transferurile nu rescriu plățile deja confirmate.

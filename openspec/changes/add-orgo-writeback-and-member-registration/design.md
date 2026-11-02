# Design

## Context și decizii

Extindem outboxul existent și mecanismele de lease/readback, fără un al doilea
motor independent de livrare. Înregistrarea unui membru este distinctă de
înscrierea sa la o activitate și de aprobarea formală a adeziunii ONCR.
Resurse oferă interfața locală, iar identitatea canonică și autentificarea
membrului rămân în Orgo. Nu persistăm parole Orgo în cereri sau în outbox.

## Capabilități și transport

Un registru tipizat descrie pentru fiecare operație obiectul canonic, câmpurile,
centru, mapările ID-urilor, prerechizitele, contractul, acreditarea și verificarea.
Tokenul server-to-server este folosit pentru capabilitățile confirmate. Nu
activăm toate domeniile prin simpla setare a unui flag general. Păstrăm fallbackul
actorului existent pentru cazurile autorizate și audităm modul utilizat.

Outboxul are subiect explicit (membru, structură, eveniment sau participare),
revision/intention, baseline, cheie de deduplicare, dependențe, stare, încercări,
lease și următoarea încercare. Schema existentă pentru membri se migrează aditiv;
nu se șterge sau rescrie istoricul. Crearea obiectului canonic precedă orice
operație dependentă. O eroare nu anulează persistența locală deja confirmată.

Fiecare scriere citește starea curentă, verifică aria și autorizarea actuală,
aplică diferența minimă și recitește. La conflict real rămâne politica existentă
Orgo-wins pentru același câmp; modificările fără legătură nu se pierd. Rolurile
sunt tratate ca asocieri individuale, cu proveniență, nu ca o listă înlocuită
orbește. Se păstrează toate rolurile neadministrate de operația locală.

Un timeout după POST nu autorizează alt POST imediat. Se caută rezultatul prin
identificator/correlation documentat; dacă absența nu poate fi demonstrată,
operația rămâne uncertain și necesită rezolvare. Un email comun sau un nume
comun nu identifică în mod unic două persoane, în special frați.

## Verificare la cerere și sincronizare la încărcare

Un resolver comun este apelat înainte ca un flux să respingă un identificator
Orgo/card exact negăsit local sau o apartenență la centru considerată greșită.
Se aplică în autentificare/asociere, fișe, înscriere la activitate, lookup/plată
cotizație și validarea noilor cereri, cu regulile de autorizare ale fiecărui
flux. Nu trimitem UUID-uri locale la endpointul numeric Orgo și nu căutăm
aproximativ după nume. ID-ul de card este rezolvat exact, fără ambiguități.

Resolverul citește identitatea și centrul din Orgo cu tokenul serverului, nu
pornește un import complet. La o identitate confirmată din centru face upsert
pe ID-ul canonic și reevaluează operația inițială o singură dată, păstrând
fișa locală, relațiile, istoricul și modificările în așteptare. Nu unifică după
email și nu creează o identitate Orgo nouă pentru un membru doar negăsit local.
Un răspuns din alt centru nu este importat ca membru al centrului nostru și nu
acordă acces; se păstrează politicile explicite pentru invitați din alte centre.
Un membru nou descoperit nu primește implicit roluri locale ori acces la fișe.

Rezultatele interne disting: găsit în centru, găsit în afara centrului,
absență confirmată și verificare indisponibilă. Timeout, 401/403, 429 și 5xx
nu dovedesc inexistența sau lipsa apartenenței. UI comunică imposibilitatea
verificării și oferă reîncercare; pentru acțiuni ce cer apartenență confirmată
nu se continuă pe presupuneri. Un rezultat pozitiv nu înlocuiește verificarea
eligibilității: o cotizație fără tarif ori obligație validă nu devine plătibilă
doar pentru că membrul există. Sunt reevaluate regulile curente fără rescrierea
încasărilor sau a prețurilor istorice.

Apelurile simultane pentru același identificator împart verificarea în curs,
cu limite de concurență, timeout și rate limiting. Fiecare încercare ulterioară
distinctă poate reverifica Orgo; un cache negativ nu blochează un membru nou
înscris. Pe rutele publice răspunsul rămâne minimizat și nu divulgă profilul,
datele tutorelui sau centrul unei persoane străine. Identificatorii publici nu
permit declanșarea unui import global și nu ocolesc limitele de acces locale.

La fiecare bootstrap autentificat al aplicației (deschidere, tab nou sau
reîncărcare completă) shellul solicită actualizarea din Orgo prin endpoint
autentificat. Pagina afișează imediat datele locale autorizate și nu așteaptă
registrul complet. Navigarea SPA, pollingul și reexecutarea unui server load
în aceeași instanță nu sunt bootstrapuri noi. Utilizatorii obișnuiți pot
solicita jobul, fără a primi dreptul de a citi registrul global sau detaliile
altor membri. Paginile publice folosesc verificarea punctuală când e necesară.

Se reutilizează jobul/lease-ul de actualizare existent, cu coalescing între
taburi, utilizatori și procese pentru același centru. Dacă rulează deja un job,
încărcarea se atașează acelui job; nu creează un al doilea. După terminare,
o nouă deschidere solicită o nouă actualizare, fără a o suprima printr-un TTL
zilnic. Retry-After/backoff pentru erori remote se respectă și se afișează ca
stare de așteptare; un reload nu resetează backofful.

Actualizarea folosește reconcilierea existentă: Orgo câștigă conflictele reale
pe același câmp, modificările locale cu baseline remote neschimbat rămân în
outbox, iar datele exclusiv locale se păstrează. Nu deducem retragere dintr-o
pagină absentă ori un import eșuat. Numai parcurgerea completă poate actualiza
ultima reușită. UI arată progresul, ultima reușită și eșecul, iar la terminare
reîncarcă doar datele autorizate fără a pierde formularul nesalvat, filtrele
sau poziția utilizatorului. Actualizarea nu produce o buclă de refresh/import.

## Înregistrare și administrare

`/register` este accesibil din login și poate fi completat pentru sine sau un
copil. Cere prenume/nume separat, data nașterii, alegerea clasei și contactele
corespunzătoare. Centrul este impus pe server; nu acceptăm alegerea altui centru,
a rolurilor administrative sau a unui status activ din payloadul public.
Formularul permite solicitarea unei unități active din centrul configurat,
cu structură locală explicită. Cererea păstrează ID-ul unității solicitate;
această preferință nu acordă apartenență sau acces înainte de validare.

Data nașterii este validată calendaristic, nu poate fi viitoare și determină
vârsta după data din Europe/Bucharest. Clasa este o valoare discriminată:
pregătitoare (0), I–XII (1–12), respectiv not-in-school. Absența răspunsului
este invalidă. „Nu sunt elev” este explicit și nu confundă un adult cu un
formular incomplet. Nu deducem clasa din vârstă și nu atribuim automat roluri.

O cerere păstrează tipul solicitantului, datele membrului, școlarizarea,
contactul local al părintelui, proveniența, versiunea și momentele deciziilor.
Stările de review sunt separate de provisioning:

- review: pending / approved / rejected / needs-information;
- provisioning: not-started / pending / running / linked / blocked / uncertain.

Trimiterea publică nu creează cont Orgo, sesiune sau drepturi. Răspunsul public
nu divulgă existența altor membri. Se limitează cererile pe server și se
verifică originea/CSRF după tipul endpointului. Linkurile de urmărire, dacă sunt
folosite, sunt opace, expirabile și fără date personale în URL.

Adminii și super_adminii au listă de cereri, detalii, editare, motiv de
respingere/cerere de completare și previzualizarea datelor trimise la Orgo.
Liderii și șefii de unitate văd datele necesare validării și pot confirma
cererile care vizează exact unitatea mandatului lor activ. Mandatele încheiate,
expirate sau ale unui membru inactiv nu dau acest drept; rolul de ajutor singur
nu îl acordă. Acest acces la cererea de înscriere nu extinde accesul general la
fișele private ale membrilor. Filtrarea și autorizarea se aplică în API, inclusiv
la acces direct prin ID; nu depind doar de filtrul interfeței.
Un lider cu mandat pe o subunitate poate confirma înscrierea în unitatea sa,
conform cerinței utilizatorului, fără acces la cererile altor unități. Cererile
fără destinație și schimbările de centru sau de unitate în afara mandatului
sunt rezolvate de admin. Crearea administrativă, respingerea și verificarea
relației tutore/copil păstrează autorizările distincte; dreptul nou al liderului
este confirmarea înscrierii în unitatea sa.
Crearea de către admin folosește același model și aceleași validări. Aprobare
și salvare se pot face într-o acțiune explicită pentru un formular complet.
Se revalidează rolul adminului sau mandatul liderului și unitatea cererii la
aprobare și înainte de provisioning; nu se înregistrează contul unei persoane
dacă aprobarea a fost între timp revocată ori aprobatorul nu mai este autorizat.
Schimbarea unității după aprobare invalidează aprobarea pentru vechea destinație
și cere o nouă confirmare. Auditul păstrează aprobatorul, mandatul și unitatea
confirmată. Tokenul serverului execută operația doar după verificarea acestui
drept local; capacitatea sa tehnică nu acordă liderului privilegii de admin.

Crearea sau asocierea folosește contractele oficiale și verifică duplicatele.
Un cont existent în alt centru necesită rezolvare explicită, fără transfer
automat. Identitatea provizorie locală și istoricul financiar/documentar se
păstrează când se confirmă ID-ul Orgo. Loginul ulterior folosește asocierea
canonică și nu creează încă o fișă. Activarea contului nu înseamnă automat
adeziune aprobată, cotizație achitată sau atribuirea rolului de lider.

## Datele părintelui și reutilizare

Contactele părintelui/tutorelui și relația cu copilul sunt locale, cu proveniență
și acces limitat. Un părinte poate avea mai mulți copii și un copil mai multe
contacte. Datele existente `profile.parentName/Phone/Email` se păstrează și se
migrează ca date de contact neconfirmate, fără a acorda acces pe baza lor.

Separăm contactul de identitatea unui cont autentificat: cunoașterea emailului,
telefonului sau ID-ului copilului nu dovedește tutela. Asocierea la un cont și
dreptul de a vedea/precompleta fișa cer verificare de către un admin sau un
flux explicit de verificare a relației. În lipsa lui, vizitatorul completează
formularul fără divulgarea datelor deja salvate. Contul copilului nu primește
automat emailul părintelui drept identitate proprie. Contractul de creare pentru
copii fără email propriu se verifică înainte de lansare; nu inventăm adrese.

Fișa membrului, formularele de activitate și acordurile citesc contactul local
autorizat. Se afișează ce contact va fi folosit și se poate corecta. Formularul
nu suprascrie contactul comun în tăcere. La înscriere/generare se salvează un
snapshot; actualizarea contactului nu schimbă documentele deja generate sau
semnate. Retragerea/revocarea accesului părintelui oprește viitoarea precompletare.
Contactele părintelui nu intră în payloadurile generice Orgo.

## Activități și finanțe

Activitățile primesc mapare Orgo stabilă și operații pentru datele comune,
publicare și participare; departamentele interne nu devin roluri naționale.
Cererea aflată pe lista de așteptare nu devine automat participare confirmată.
Anulările păstrează legătura și istoricul, fără ștergerea documentelor financiare.

Finanțele refolosesc ledgerul și mecanismul național existente. O actualizare
de sold local nu este un ordin nou de încasare/refund. Transferul bancar și
aprobarea națională nu se automatizează ca efect secundar. Orice echivalență
pentru taxe de eveniment se probează separat de fee_payments pentru cotizații.

## Migrare, verificare și lansare

Migrare aditivă, compatibilă cu rândurile vechi; zero apeluri Orgo în migrare.
Inventarul final al mutațiilor justifică fiecare operație local-only rămasă.
Backlogul este recitit și previzualizat: diferențe încă relevante, conflicte,
date locale fără echivalent, deja confirmate și cazuri incerte. Cele trei roluri
aplicate manual pe 2 noiembrie sunt deja synced și nu se reexecută.

Implementarea se face în etapele din tasks.md. Lansarea folosește verificare
pe fiecare capabilitate, nu presupunerea că un PATCH reușit autorizează toate
endpointurile. Testele automate folosesc date sintetice. Nu creăm conturi reale,
nu retragem persoane și nu generăm plăți pentru a descoperi contractele.
Oprirea workerului/flagului oprește livrarea și păstrează intențiile; revenirea
de versiune nu șterge date sau compensază automat operații financiare.

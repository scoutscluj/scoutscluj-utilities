# Design

## Modelul organizațional

O **structură locală** este distinctă de o ramură de vârstă, o unitate, o subgrupă
și centrul canonic Orgo. Inițial există Cluj și Florești; Florești este în formare
în cadrul organizării curente a Clujului. ID-urile locale rămân stabile și nu
sunt derivate din etichete sau din numele persoanelor.

Un membru are o structură principală inclusiv când nu are unitate. O unitate
aparține unei singure structuri, iar subgrupele urmează structura unității.
Apartenența beneficiarului și unitatea sa trebuie să fie compatibile.
Responsabilitățile adulților rămân independente de apartenența principală și
pot exista în unități din ambele structuri.

Un mandat local de responsabil este acordat de Consiliu unui membru adult
verificat. Pot exista mai mulți responsabili. Drepturile sale sunt evaluate
prin structura mandatului, fără a seta `admin` sau `councilAdmin` global.
Mandatul permite gestiunea structurii locale, unităților, șefilor și membrilor;
nu acordă operațiuni financiare sau numirea altor administratori globali.
Promisiunea rămâne obligatorie pentru rolurile care o cer deja.

Politicile verifică pe server apartenența, unitatea, subgrupa, responsabilitățile
și mandatul local. Un adult repartizat între structuri primește accesul
responsabilității respective, nu administrarea întregii structuri destinație.
Fișele medicale și notițele urmează aceleași limite de unitate și rol ca acum.

Transferul apartenenței și atribuirea responsabilităților în cealaltă structură
sunt operații ale Consiliului Cluj. Încetarea unei responsabilități locale
rămâne disponibilă gestionarilor acelei unități.

### Alegere conservatoare pentru retragerea unui adult din altă structură

Întrebarea despre retragerea globală a unui adult Cluj care ajută Florești nu a
primit un răspuns explicit înaintea schimbării discuției spre plăți. Propunerea
păstrează limita responsabililor locali: ei pot încheia implicarea adultului
în unitățile lor; retragerea globală a adultului din cealaltă structură revine
Consiliului. Retragerea propriilor membri continuă să încheie toate activitățile,
conform regulilor deja agreate. Aceasta este o alegere de design, nu o decizie
atribuită explicit utilizatorului.

## Încadrarea inițială și Orgo

Migrarea păstrează organizarea și drepturile existente până la configurarea
explicită a noilor apartenențe. Consiliul primește o previzualizare pentru
încadrarea membrilor și a unităților, inclusiv a celor deja importate.
Eticheta normalizată „Florești” din numele unui membru propune încadrarea inițială;
Consiliul poate corecta propunerea înainte de confirmare.

O nepotrivire între apartenența propusă și unitatea existentă trebuie rezolvată
în previzualizare, fără mutări ascunse sau inventarea claselor. ID-urile Orgo,
identitățile provizorii și regulile contra duplicatelor sunt păstrate. Membrii
inactivi rămân separați, inclusiv în previzualizările de încadrare. Numele din
Orgo nu sunt curățate sau rescrise automat.

Apartenența explicită nu este recalculată după o schimbare a numelui. Subgrupele
locale sunt configurabile; patrulele Orgo rămân excluse. Se folosesc tokenul
server-to-server și verificările centrului Orgo existent. Această organizare
locală nu acordă implicit acces la un alt centru canonic Orgo.

## Progresie și transferuri

Destinațiile progresiei sunt căutate numai în structura membrului. Lipsa
Exploratorilor în Florești produce o tranziție pentru verificare manuală,
păstrând apartenența și istoricul. Nu se creează automat unități și nu se alege
o destinație Cluj doar fiindcă există acolo aceeași ramură.

Transferul între structuri este tranzacțional și auditat. Verifică destinația,
repartizările și eventualele plăți în curs. Tariful adeziunii neplătite urmează
noua apartenență, iar plățile confirmate își păstrează valoarea. O plată aflată
în curs este semnalată financiar; datele sale confirmate nu se rescriu.

## Adeziuni bancare

În codul actual, `bankReceipt` și `allocate` alocă încasările manuale la
cotizație, iar `admissionState` caută checkouturi online de adeziune reușite și
încasările lor confirmate. Se introduce evidența explicită a alocărilor manuale
la adeziune, legată de identitatea Orgo verificată și de încasarea bancară reală.
Nu se fabrică un checkout online pentru un transfer bancar.

Încasarea păstrează referința unică, suma efectivă, data, autorul și detaliile
justificative. Poate exista inițial nealocată, inclusiv când identitatea unui
beneficiar necesită verificare. Înregistrarea din nou a aceleiași încasări este
respinsă, iar o încasare deja existentă poate fi selectată pentru alocare.

Alocările unei încasări pot acoperi mai multe persoane și atât adeziuni, cât și
cotizații. Totalul disponibil se calculează peste toate destinațiile, ținând
cont de restituiri și corecții; suma nu poate fi consumată de două ori.
Adeziunea este unică pe identitatea membrului, independent de anul cotizației.
Plățile istorice manuale nu sunt blocate de eligibilitatea de șase luni a
checkoutului online.

Sumele istorice confirmate se păstrează, inclusiv un tarif anterior diferit.
O alocare parțială nu este prezentată automat ca adeziune integral achitată.
Confirmarea unui tarif istoric folosește evidența verificată de responsabilul
financiar, cu justificare, nu presupunerea că orice sumă primită este completă.

Starea adeziunii agregă evidența online existentă și alocările manuale valide.
Aceeași stare este folosită în registru, fișă și toate fluxurile de plată pentru
a evita solicitarea repetată. Corecțiile sunt auditate și nu șterg încasarea
originală. Conflictele cu plăți online în curs sau cu dublări sunt vizibile
responsabilului financiar.

Sumele alocate la adeziune nu cresc cotizația achitată, componenta națională
sau alte totaluri pentru care nu sunt destinate. Toate calculele de sold,
alocare, corecție și restituire trebuie actualizate împreună. Se păstrează
ordinea blocărilor tranzacționale folosite deja de finanțe și retrageri.

## Interfață

Se păstrează „Unități și membri”, cu un filtru simplu de structură pentru cei
care au acces la mai multe. Opțiunile pentru unități și grupe se adaptează
structurii. Consiliul poate vedea toate structurile; un responsabil Florești
vede implicit aria sa. Nu sunt necesare meniuri sau aplicații duplicate.

Încasarea din extras se înregistrează într-un flux scurt: persoană și destinație,
sumă, dată și referință. Același flux poate împărți încasarea când este necesar.
După confirmare, fișa arată clar „Adeziune achitată”. Responsabilii locali văd
statusul relevant, iar operațiile și detaliile bancare rămân la personalul cu
drepturi financiare. Nu se cere utilizatorului să înțeleagă schema contabilă.

## Limite și validare

Nu se implementează acum desprinderea ca centru independent, o nouă instanță
Orgo, finanțe autonome Florești sau un parser automat de extrase. Structurile
explicite pregătesc discuția viitoare fără a o decide anticipat.

Testele trebuie să verifice refuzul cererilor din afara ariei, inclusiv cereri
HTTP construite manual; actorii cu roluri combinate; nume schimbate după import;
progresia fără destinație locală; istoricul inactiv; migrarea pe PostgreSQL;
adeziuni bancare și online, sume istorice, alocări multiple, corecții și
concurență; păstrarea distinctă a soldurilor cotizației și adeziunii. Testele de
browser urmăresc fluxul simplu de încasare și selecția corectă a structurii.

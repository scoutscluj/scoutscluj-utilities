# Gestiunea membrilor, unităților și subgrupelor

## Why

Organizarea statică din Orgo nu acoperă ușor parcursul beneficiarilor pe clase,
grupele stabile, responsabilitățile adulților și actualizarea anuală. Liderii au
nevoie să gestioneze membrii și să vadă cotizațiile și informațiile relevante
pentru activități dintr-un singur loc, cu sincronizare în Orgo.

Propunerea consemnează deciziile din interviul din 19 octombrie 2026. Este o
propunere pentru implementare; nu reprezintă funcționalitate deja livrată și nu
confirmă permisiunile tokenului Orgo din producție.

## What Changes

- Platforma devine locul principal pentru gestiunea operațională. Identitatea
  canonică rămâne legată de Orgo; modificările compatibile sunt sincronizate,
  iar conflictele sunt prezentate pentru rezolvare.
- Unitățile pot funcționa ca un colectiv comun sau cu subgrupe configurabile.
  Fiecare beneficiar are cel mult o subgrupă curentă; adulții pot avea mai multe
  responsabilități, inclusiv în unități diferite.
- Grupele de temerari sunt comunități stabile: identitatea grupei, copiii și
  adulții responsabili se păstrează când clasa avansează. După clasa a VIII-a,
  copiii trec în colectivul exploratorilor, grupa se arhivează, iar adulții sunt
  repartizați separat. Lupișorii pornesc cu un colectiv comun.
- La 1 septembrie, în fusul Europe/Bucharest, avansează clasele și apartenențele
  aferente noului an cercetășesc care începe în octombrie. Sunt disponibile
  excepții individuale și corecturi manuale oricând.
- Seniorii pot fi simultan voluntari adulți/ajutoare de lider, dar nu lideri.
  Rolul de lider presupune promisiunea de lider. La actualizarea din septembrie,
  seniorii care au împlinit 24 de ani devin voluntari adulți fără unitate.
  Scouter este un rol atribuit explicit, separat de această tranziție.
- Liderii văd toată unitatea, inclusiv cotizațiile, datele medicale și notițele;
  modifică membrii grupei proprii. În colectivele comune gestionează colectivul
  la care sunt repartizați. Șeful poate modifica toți membrii unității.
- Voluntarii văd implicit membrii grupei proprii; șeful le poate acorda explicit
  drepturi de modificare și de vizualizare a cotizațiilor. Informațiile medicale
  și notițele nu sunt incluse automat în accesul de bază.
- Liderii pot modifica datele de contact și datele medicale în limitele lor de
  gestiune; numele și data nașterii sunt modificate de șef sau consiliu.
- Șefii și consiliul pot acorda rolul de lider și consemna promisiunea.
  Consiliul gestionează unitățile și numește șefii; șefii gestionează subgrupele
  și repartizarea adulților în propriile unități.
- Un mandat activ în consiliu acordă acces de administrator. Încheierea lui
  retrage numai accesul provenit din mandat. Mandatele sunt gestionate de
  administratori; nu acordă automat rolul tehnic `super_admin`.
- Membrii noi pot fi adăugați de lider, șef sau consiliu în aria sa, cu verificarea
  duplicatelor și o stare explicită până la crearea confirmată în Orgo.
- Mutările manuale între unități sunt făcute de șeful unității de origine sau
  consiliu. Șeful destinației este notificat și face repartizarea în subgrupă.
- Retragerea schimbă imediat statusul în „Retras din activitate”, fără aprobarea
  șefului, și încheie toate implicările persoanei. Istoricul rămâne disponibil.
  Membrul retras nu este urmărit pentru restanțe. La revenire se datorează doar
  cotizația anului curent, ținând cont de plățile deja făcute pentru acel an.
- Reactivarea este permisă în aceeași arie de gestiune, cu alegerea destinației;
  responsabilitățile de adult și privilegiile vechi nu revin automat.
- Fișa reutilizabilă conține date de contact, contacte de urgență, informații
  medicale și câmpuri reutilizabile la înscriere. Părintele poate folosi contul
  copilului; modificările sunt atribuite contului autentificat. Nu este necesar
  un sistem separat de conturi și invitații pentru părinți în această etapă.
- Fișa urmează membrul în noua unitate. Liderii fostei unități pierd accesul la
  fișa curentă. Notițele interne rămân exclusiv locale. Datele medicale pot fi
  sincronizate numai dacă Orgo oferă câmpuri și acces adecvat.
- Formularele de înscriere la activități sunt distincte de acordurile parentale
  PDF generate și semnate. Viitoarele formulare precompletează fișa, solicită
  reconfirmarea datelor medicale/contactelor de urgență și salvează corecturile
  pentru viitor. Înscrierile păstrează un instantaneu al datelor confirmate.
- Integrarea preferă `Api-Token` server-to-server. O modificare se poate aplica
  local cu starea „În așteptarea sincronizării”. Nu există comutare automată la
  tokenul utilizatorului; folosirea lui este explicită și limitată la operație.

## Impact

NestJS/MikroORM/Postgres: registru operațional de membri, unități, apartenențe
istorice, permisiuni pe arii, fișe, notițe, progresie anuală și coadă Orgo.
SvelteKit: liste și fișe de membri, structură de unități, administrare și stări
de sincronizare. Cotizațiile reutilizează registrul financiar existent prin
proiecții limitate la unitate; rolul de lider nu acordă acces financiar general.

Detaliile tehnice, limitele și verificările Orgo sunt în [design.md](design.md).
Ordinea implementării este în [tasks.md](tasks.md).

## Out of Scope

Prezențe la întâlniri, arhiva fișelor de activitate, un sistem complet de
înscrieri/plăți pentru activități, semnarea electronică a acordurilor parentale,
înlocuirea fluxului PDF și formularul public de admitere. Fișa de membru și
contractul de reutilizare pregătesc viitoarele formulare, fără să le confunde cu
acordurile parentale.

## Open Points Before Implementation

- Identificarea efectivă a unităților, tipurilor, rolurilor și statusului
  „Retras din activitate” configurate în tenantul ONCR, prin citire autorizată.
- Matricea de capabilități a tokenului existent și contractele de scriere
  efectiv acceptate; documentația publică nu dovedește aceste permisiuni.
- Inventarul câmpurilor individuale și maparea lor în Orgo. Câmpurile fără
  echivalent verificat rămân locale, cu acest lucru afișat explicit.
- Validarea importului inițial al claselor și grupelor: lipsurile sau
  contradicțiile nu sunt rezolvate prin presupunerea clasei din vârstă.

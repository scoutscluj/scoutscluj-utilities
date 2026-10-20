# Design

## Contract Orgo verificat

Citire autorizată, numai server-to-server, la 20 octombrie 2026:

- Lista `/api/v1/users` omite o parte din fișă; detaliul `/api/v1/users/{id}`
  expune `type`, `userRoles`, `logo`, adresa, localitatea, legăturile sociale,
  informațiile educaționale/profesionale și `customFieldValues`.
- `type` este un obiect Role. `userRoles` conține obiecte cu `role`, `unit`,
  `dateCreated`, `dateEnded` și indicatori administrativi. `roleGroups` este o
  listă de identificatori; nu înlocuiește funcțiile explicite.
- Dicționarul `/api/v1/roles` conține nume identice în contexte diferite.
  Maparea folosește identificatorul și contextul unității, nu numai eticheta.
  Tipurile includ Lupișor (38), Temerar (39), Explorator (40), Senior (41),
  Lider (42) și Scouter (44). Funcțiile includ Șef unitate (7), Membru Consiliul
  CL (8) și Șef Centru Local (3); dicționarul este verificat înainte de mapare.
- `logo` este o referință de imagine. Frontendul oficial încarcă fotografia prin
  `POST /media_objects`, multipart cu `file`, `type=user` și `entity_id`.
  Contractul frontendului nu dovedește permisiunea de scriere a tokenului.
- Câmpurile personalizate au identificator de câmp și valoare, posibil media.
  Definițiile și tipurile lor trebuie citite înaintea construirii editorului.

Nu s-au executat modificări asupra membrilor reali pentru verificarea API-ului.

## Profil și acces

Se separă profilul normalizat editabil, câmpurile personalizate tipizate și
instantaneul necesar reconcilierii. Nu se persistă în mod nediferențiat întregul
obiect User: tokenuri push, permisiuni tehnice, MFA și setări interne nu sunt
date ale fișei cercetășești. Indicatorii financiari sunt afișați prin modulele
existente și nu pot fi modificați printr-un patch generic de profil.

Editorul folosește o listă explicită de câmpuri și validări. Câmpurile necunoscute
nu sunt trimise automat în PATCH. Aceleași limite de vizibilitate se aplică
fișei, fotografiei, conflictelor și răspunsurilor API; un instantaneu brut nu
poate ocoli restricțiile pentru date medicale sau identitate.

Confirmarea promisiunii primește o proveniență explicită: dată declarată local
sau rol Lider verificat în Orgo. Lipsa datei nu împiedică importul confirmat;
un rol de lider asistent nu este echivalat automat cu promisiunea.

Unitățile se leagă prin identificatorii Orgo deja importați. Ramura nu este
dedusă din vârstă. Repartizările ambigue, unitățile lipsă, rolurile necunoscute
și combinațiile incompatibile sunt semnalate în previzualizare. Nu se importă
patrule și nici responsabilitățile lor ca privilegii locale.

## Sincronizare și conflicte

Pentru fiecare câmp se compară baza comună, valoarea locală și cea remote.
O singură parte modificată se poate aplica fără conflict. Două modificări
identice converg. Două valori diferite produc un conflict explicit. O rezolvare
verifică revizia membrului și valoarea remote curentă înainte de scriere.

Coada existentă păstrează serializarea, verificarea reviziilor și reîncercările.
O eroare de citire nu golește profilul. Schimbările nesuportate rămân locale cu
stare explicită. Nu există fallback automat la tokenul utilizatorului.
Actualizarea zilnică este idempotentă și respectă centrul Orgo configurat,
apartenența locală confirmată, retragerea și drepturile acordate explicit.

Fotografiile sunt accesate prin referințe validate și acces autorizat, fără
expunerea tokenului Orgo. Încărcarea validează formatul, dimensiunea și conținutul;
URL-urile arbitrare nu devin un mecanism de descărcare pe server.

## Tabel și loturi

Registrul păstrează modul simplu de citire. O acțiune explicită deschide editorul
rândului; selectarea multiplă afișează acțiunile comune. Utilizatorul vede numai
destinațiile și operațiile permise. Istoricul inactivilor rămâne separat.

Previzualizarea lotului identifică membrii și schimbările concrete. Aplicarea
revalidează drepturile și reviziile pe server și este atomică: un membru devenit
neeligibil oprește lotul, fără aplicare parțială ascunsă. Retragerea încheie toate
responsabilitățile conform politicii existente; reactivarea nu restaurează
mandatele. Fiecare schimbare produce audit și sincronizare per membru.

Selecția „toate rezultatele” se bazează pe setul explicit de identificatori și
revizii din previzualizare, nu pe executarea din nou a unui filtru arbitrar la
confirmare. Transferul în lot la Florești folosește politica existentă pentru
transferul între structuri, numai pentru Consiliu, și afișează destinația
unității sau necesitatea repartizării. Numele ajută la selectare, fără a deveni
regulă permanentă de apartenență.

Confirmarea inactivilor ca retrași operează asupra registrului local, încheie
implicările și păstrează statusul Orgo original ca proveniență. Nu produce
încasări, datorii istorice sau scrieri remote redundante. Reimportul nu poate
anula confirmarea locală fără o reactivare explicită.

## Cotizații împărțite și acces din registru

Meniul contextual preselectează membrul și perioada curentă, afișând separat
componenta națională, componenta locală și sumele deja recunoscute. Componentele
se iau din tariful perioadei; nu se presupune matematic jumătate pentru orice
tarif. Operatorul poate alege altă perioadă.

Se reutilizează verificarea Orgo a istoricului pentru intervalul exact din
OrgoNationalService, în mod exclusiv de citire. Statusul general isFeeActive
nu dovedește singur plata perioadei. O confirmare remote devine o acoperire
externă distinctă, cu proveniență și audit, nu o încasare fictivă în bancă a
centrului. Dacă verificarea nu este disponibilă, încasarea locală poate fi
salvată, dar confirmarea națională rămâne de verificat.

Încasarea locală folosește registrul bancar și alocările existente: sumă, dată,
referință, disponibil nealocat. O încasare existentă poate fi asociată fără
duplicare. Soldurile, checkout-ul, corecțiile și rambursările disting acoperirea
externă de fondurile centrului. Partea națională deja achitată direct nu mai
intră într-un lot de transfer național și nu este retrimisă în Orgo. Confirmarea
și reîncercarea sunt idempotente, iar coliziunile cu plăți în curs sau transferuri
existente cer reconciliere, fără suprascriere tacită.

Vizualizarea cotizațiilor este disponibilă pentru fiecare membru deja vizibil
în registru, inclusiv pentru voluntarii care au acces la acel membru. Răspunsul
conține situația cotizației, nu datele bancare, plățile altor membri sau acces
la întreaga pagină de administrare financiară. Operațiile din meniul contextual
rămân limitate rolurilor financiare existente și sunt validate în API.

## Livrare

Migrare aditivă, teste de mapare și reconciliere, teste HTTP pentru drepturi și
loturi, verificare Postgres și verificarea fluxurilor web. PR către main,
verificări CI, apoi publicare în producție conform instrucțiunii utilizatorului.
Importul efectiv al datelor reale și acordarea accesului rămân acțiuni explicite
din previzualizarea Consiliului.

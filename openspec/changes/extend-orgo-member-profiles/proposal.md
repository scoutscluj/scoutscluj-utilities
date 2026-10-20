# Roluri Orgo, fișe complete și editarea registrului

## Why

Importul actual preia identitatea, statusul și câteva date de contact, dar nu
preia complet tipul cercetășesc, funcțiile și fișa detaliată. Gestiunea membrilor
trebuie să poată continua în Resurse fără completarea din nou a datelor existente
în Orgo. Corecturile uzuale trebuie să fie disponibile direct în registru.

## What Changes

- Importul citește fișa detaliată, tipul membrului și funcțiile active din Orgo.
  Previzualizarea arată ramura, unitatea, responsabilitățile și accesul rezultat;
  Consiliul confirmă aplicarea lor. Funcțiile din patrule nu sunt importate.
- Rolul de Lider din Orgo constituie confirmarea promisiunii de lider, fără
  inventarea unei date. Rămân valabile verificările de vârstă și restricția
  conform căreia un beneficiar senior poate fi ajutor, dar nu lider.
- Fișa include fotografia și toate informațiile de profil disponibile prin
  API, organizate în secțiuni ușor de înțeles. Câmpurile de profil modificabile
  pot fi editate în Resurse în limitele permisiunilor existente. Identificatorii,
  indicatorii calculați și informațiile administrate de alte module rămân
  informative. Configurația de securitate a contului nu devine un formular de
  editare a membrului.
- Fotografia poate fi schimbată din fișă. Sincronizarea folosește mecanismul
  Orgo de încărcare media dacă tokenul serverului îl permite; orice limitare
  este vizibilă și nu este raportată drept sincronizare reușită.
- Clasa, unitatea/grupa și statusul activ/retras se pot modifica individual
  direct din tabel și în lot. Modificările în lot au o previzualizare comună,
  validare pentru fiecare membru și confirmare înainte de aplicare. Datele
  medicale și câmpurile ample rămân în fișă.
- Actualizarea din Orgo rulează zilnic și la cerere. Modificările locale sunt
  trimise imediat în coada de sincronizare. Dacă același câmp s-a modificat în
  ambele sisteme, se păstrează cele două variante pentru alegere manuală;
  câmpurile fără conflict se actualizează automat.
- Importul ulterior nu reînvie membrii retrași, nu restaurează privilegii
  încheiate și nu mută automat apartenența Cluj/Florești după nume. Schimbările
  de funcții care acordă acces trec prin previzualizarea Consiliului.

- Filtrarea permite selectarea tuturor rezultatelor, inclusiv de pe alte pagini,
  și mutarea în lot la Florești. Numărul persoanelor și repartizările afectate
  sunt vizibile înainte de confirmare. Transferurile între Cluj și Florești
  rămân rezervate Consiliului.
- Membrii importați ca inactivi pot fi confirmați individual sau în lot ca
  „Retrași din activitate”, din secțiunea lor separată, fără aprobare suplimentară
  sau obligații financiare noi.
- Meniul contextual oferă „Național achitat în Orgo — confirmă partea locală”.
  Pentru perioada aleasă, plata națională este verificată în Orgo și evidențiată
  distinct de încasarea locală din extras. Se înregistrează numai suma primită
  de centru; nu se dublează încasarea sau transferul către național.
- Oricine are acces la registru poate vedea, la cerere, cotizațiile membrilor
  pe care îi poate vedea deja, inclusiv partea locală și cea națională. Aceasta
  nu extinde aria de membri vizibili și nu acordă drepturi de operare financiară.

## Impact

API și baza de date: profil extins, dovada promisiunii distinctă de dată, mapări
explicite ale rolurilor și unităților, instantanee de sincronizare, conflicte,
fotografii și operații în lot cu audit. Web: previzualizare de import, fișa
extinsă, editare în tabel și selectare multiplă. Autentificarea și finanțele
păstrează regulile existente; o etichetă generică din Orgo nu acordă implicit
drepturi financiare sau rolul tehnic super_admin.

Registrul financiar distinge plățile naționale directe de banii încasați efectiv
de centru și evită retransmiterea lor în loturile naționale. Se reutilizează
încasările și referințele bancare existente, cu audit și protecție la dublare.

## Status

Deciziile de mai sus au fost confirmate în interviul din 20 octombrie 2026.
Propunerea a fost aprobată explicit la 20 octombrie 2026 pentru implementare și
publicare în producție.

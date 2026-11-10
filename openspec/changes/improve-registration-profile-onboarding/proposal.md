# Înscriere adaptată persoanei și acces explicat clar

## Why

Formularul trebuie să distingă persoana înscrisă de persoana care completează
cererea. Genul lipsește din datele obligatorii trimise în Orgo, iar fotografia
poate fi pregătită înaintea aprobării. Liderii au nevoie de instrucțiuni comune,
ușor de trimis părinților, și de un indicator vizibil pentru cererile noi.

## What Changes

- Primul pas cere explicit „Pentru mine” sau „Pentru copilul meu / altă persoană”.
  Alegerea adaptează etichetele și explicațiile; câmpurile nu apar înaintea ei.
- Gen obligatoriu și fotografie opțională, cu previzualizare, înlocuire și
  eliminare înainte de trimitere. Datele sunt vizibile la verificarea cererii și
  sunt transmise în Orgo după aprobare, cu verificarea rezultatului.
- Email obligatoriu și unic pentru contul persoanei înscrise. Pentru sine nu
  afișăm explicația destinată părinților. Pentru altă persoană recomandăm emailul
  propriu al acesteia; permitem adresa părintelui dacă nu aparține altui cont.
  Contactul tutorelui rămâne distinct și poate fi reutilizat pentru frați.
- Data nașterii determină minoratul. Contactele tutorelui sunt obligatorii pentru
  orice minor, inclusiv când alege înscrierea pentru sine. Pentru alt adult se
  cer numele și emailul persoanei care completează, fără eticheta de tutore.
- Confirmarea explică verificarea de către lider, crearea contului în platforma
  națională Orgo / membri.scout.ro, care centralizează membrii din țară, și
  folosirea acelui cont la autentificarea în Resurse. După activare, persoana
  deschide Resurse și alege „Connect with Orgo”, apoi folosește codul primit la
  emailul contului. Nu este necesară configurarea prealabilă în membri.scout.ro.
  Google poate fi prezentat ca alternativă pentru aceeași adresă; testul complet
  a fost făcut prin cod pe email, nu prin Google.
- Buton „Copiază instrucțiunile” în dreapta sus, în formular și în confirmare:
  mesaj complet pentru WhatsApp/email, cu URL absolut al formularului, datele
  necesare, regula emailului, aprobarea, explicația Orgo și autentificarea.
- Instrucțiunile vor include tutorialul video după publicarea lui. În prima
  livrare nu afișăm URL fictiv sau link nefuncțional. Crearea și publicarea
  tutorialului urmează verificării modificărilor în producție.
- În „Membri și unități”, buton roșu „Cereri noi (N)” când există cereri în
  așteptarea verificării. Numărul și lista respectă aria de aprobare existentă;
  butonul nu adaugă o intrare separată în meniul principal.

## Impact

SvelteKit: formular public și intern reutilizat, confirmare, instrucțiuni comune,
vizualizarea cererilor și indicatorul din registru. NestJS: validare, payload de
cerere, contacte separate și outbox Orgo. Se păstrează cererile vechi fără gen,
fotografie sau noul mod de înscriere; nu se modifică identități istorice automat.
Stocarea fotografiei va reutiliza mecanismele private existente; datele binare
nu se includ în loguri, audit sau răspunsurile de listă inutile.

Nu introducem parole în formular și nu schimbăm regulile de autorizare sau
configurația națională Orgo. Fotografia se sincronizează separat de crearea
contului; un refuz de upload nu retrimite crearea contului.

## Decisions confirmed

Confirmate în interviul din 10 noiembrie 2026: gen obligatoriu, fotografie
opțională; email propriu sau al părintelui, unic; contacte pentru minori și
completanții altor adulți; instrucțiuni complete în formular și confirmare.

## Verification confirmed

Cu autorizarea utilizatorului a fost creat un singur cont de test în Orgo,
marcat „Test Integrare Resurse”, ID 204560. Recitirea a confirmat status ACTIVE,
numele, data nașterii și genul. Utilizatorul a confirmat primul login direct în
Resurse folosind codul pe email, fără configurarea parolei sau a profilului.
Autentificarea cu Google era de asemenea disponibilă; nu este consemnată drept
testată complet. Nu se creează alte conturi pentru acest test și nu se solicită
parola sau codul primit pe email.

## Approval

Aprobată explicit de utilizator pe 10 noiembrie 2026 pentru implementare și publicare în producție. Tutorialul video urmează după deployment.

## 1. Model și migrare

- [x] 1.1 Introducerea catalogului celor șapte categorii și celor 14 unități fixe, cu constrângeri.
- [x] 1.2 Separarea subunităților, afilierii principale și responsabilităților; legături multiple către sursa Orgo.
- [x] 1.3 Previzualizare și confirmare centrală a clasificării din nume/categoria Orgo, cu excepții și audit.
- [x] 1.4 Backfill idempotent și maparea referințelor vechi; raport pentru ambiguități și mandatele incompatibile.
- [x] 1.5 Verificarea migrării pe o copie de date și documentarea revenirii fără pierderi.

## 2. Politica de acces

- [x] 2.1 Centralizarea verificării structurii înainte de verificarea operației și eliminarea accesului global implicit.
- [x] 2.2 Separarea registrului de bază de datele personale, medicale, note și cotizații.
- [x] 2.3 Aplicarea ierarhiei de delegare, limitelor mandatului și retragerii drepturilor derivate.
- [x] 2.4 Aplicarea politicii la detalii, listări, numărători, filtre, export și operații în lot; auditarea mutațiilor.

## 3. Interfață și integrare

- [x] 3.1 Unificarea paginilor de membri/unități și înlocuirea submeniurilor de administrare cu acțiuni contextuale autorizate.
- [x] 3.2 Dialoguri de adăugare/editare/repartizare și capabilități per element.
- [x] 3.3 Filtre independente pentru structură, categorie, subunitate, nerepartizați și date de verificat.
- [x] 3.4 Format comun compact al tabelelor, paginare extinsă și totaluri corecte în aria accesibilă.
- [x] 3.5 Adaptarea sincronizării Orgo, conflictelor și progresiei fără activarea progresiei automate.
- [x] 3.6 Actualizarea CONTEXT.md, regulilor de design și documentației API; reconcilierea specificațiilor anterioare.

## 4. Validare și livrare

- [x] 4.1 Teste de migrare: rerulare, normalizare Florești, redenumire fără reclasificare, categorii lipsă/contradictorii, referințe și istoric financiar păstrate.
- [x] 4.2 Teste de securitate: acces direct prin ID, date/count/export din altă structură, lot mixt, delegare excesivă, expirare/revocare, mandatele centrale explicite.
- [x] 4.3 Teste pentru catalogul imuabil, categoria fără subunitate, cele șapte categorii și regresiile sincronizării/progresiei.
- [x] 4.4 Verificări browser pentru principalele roluri, meniuri/dialoguri, filtre și layout desktop/mobil; verificări proiect relevante.
- [x] 4.5 PR cu rezultate de validare și pașii de migrare/activare. Publicarea urmează fluxul documentat în rollout.md.

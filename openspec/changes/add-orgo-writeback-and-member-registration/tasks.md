## Implementare locală

- [x] Propunere OpenSpec validată strict și aprobată explicit de utilizator.
- [x] Inventar al echivalentelor și limită explicită între operații naționale și evidențe locale.
- [x] Outbox persistent pentru profil, clasă, roluri, repartizare, progresie și lifecycle; revalidare actor, lease/heartbeat și readback.
- [x] Atribuiri individuale, încheiere/expirare și înlocuire șef fără înlocuirea întregului set de roluri Orgo.
- [x] Retragerea încheie responsabilitățile și emite operații distincte; reactivarea nu redeschide mandatele istorice.
- [x] Outbox tranzacțional PostgreSQL pentru activități, publicare, participări, ștergerea înscrierilor și structuri, cu mapări explicite.
- [x] Markeri persistenți pentru creări cu rezultat incert și recuperare administrativă fără POST repetat automat.
- [x] Migrare aditivă: cereri, contacte tutore, corelare obiecte, lease și clasa 0; fără replay automat al istoricului.
- [x] Formular public `/register`, acces din login, dată naștere/vârstă și alegere obligatorie a clasei.
- [x] Datele tutorelui distincte de copil, păstrate local și reutilizate în profil/precompletarea activităților; contactul nu conferă drepturi de acces.
- [x] Creare, corectare, aprobare, respingere și cerere de completare de către admin; cererile corectate necesită o nouă aprobare.
- [x] Lideri/șefi activi pentru întreaga unitate pot confirma numai cererile acelei unități; verificare din nou înainte de provisioning.
- [x] Creare/asociere după aprobare cu centru fix, verificare nume/data nașterii/ID și corelare imediată înainte de readback.
- [x] Lookup exact ID/card în Orgo înainte de refuz pentru identitate absentă/afiliere neconfirmată; eroarea remote este distinctă de absență.
- [x] Bootstrap autentificat neblocant, job comun per centru, backoff și lease; navigarea SPA nu repetă importul.
- [x] Administrare sincronizare: stări explicite, comparație versionată înainte de retry istoric și dovadă pentru recuperarea unei creări incerte.
- [x] Păstrarea mecanismelor financiare existente, istoricului și documentelor; fără debitare/restituire suplimentară din sincronizarea obiectelor.
- [x] Teste API pentru validări, arie de aprobare, revocare, asociere/timeout, roluri independente, conflicte, lookup și refresh.
- [x] Test PostgreSQL executabil pentru migrare, clasa 0, contacte neverificate, outbox atomic, câmpuri private și prevenirea buclelor de readback.
- [x] Browser QA public/admin cu date sintetice, mobil, clasa 0, aprobare și bootstrap/reload versus SPA.
- [x] Documentație operațională, configurarea secretelor de deployment și procedura de oprire/recuperare.

## Lansare și verificări în tenant — încă neefectuate

Aceste puncte nu sunt declarate îndeplinite de testele cu date sintetice. Codul păstrează operațiile blocate când configurația/contractul lipsește; flagurile noi sunt dezactivate implicit.

- [ ] Confirmă în tenant drepturile tokenului separat pentru provisioning, roluri individuale, lifecycle, unități, events și attendance.
- [ ] Confirmă codurile retragerii/arhivării, câmpul clasei, tipurile structurale și mapările stărilor evenimentului/participării; configurează numai echivalentele verificate.
- [ ] Confirmă pe identități de test crearea copilului fără email propriu, notificarea Orgo și primul login. Nu se creează persoane reale pentru descoperirea contractului.
- [ ] Aplică migrarea și lansează versiunea; verifică fiecare capabilitate activată de la UI la readback înainte de a declara sincronizarea completă în producție.
- [ ] Previzualizează și reia explicit operațiile istorice încă relevante. Cele trei roluri Lider deja confirmate se exclud automat prin starea synced.

Portalul autentificat al tutorelui/verificarea legală a tutelei și plățile de activitate fără contract Orgo echivalent nu sunt implementate implicit. Contactele sunt reutilizabile de fluxurile autorizate existente. Detaliile și comenzile de verificare sunt în `docs/orgo-sync-and-registration.md`.

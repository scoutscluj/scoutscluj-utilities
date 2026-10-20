## 1. Specificație

- [x] Consolidează deciziile despre Florești și cerința adeziunilor bancare.
- [x] Separă deciziile confirmate de alegerea conservatoare rămasă neconfirmată.
- [x] Aprobă propunerea înainte de implementarea schimbărilor de arhitectură.

## 2. Structuri și acces

- [x] Adaugă migrarea aditivă și entitățile pentru structuri, apartenențe și responsabili locali.
- [x] Introdu politici de acces pe server, fără acordarea rolului global `admin` responsabililor locali.
- [x] Adaugă gestiunea unităților și repartizărilor în structură, plus transferurile și mandatele controlate de Consiliu.
- [x] Păstrează accesul adulților repartizați între structuri și limitele retragerii globale.
- [x] Adaugă previzualizarea și confirmarea încadrării inițiale, inclusiv pentru datele existente.
- [x] Limitează destinațiile progresiei la structura membrului și păstrează cazurile fără destinație pentru verificare.
- [x] Adaptează registrul, fișele și filtrele; păstrează istoricul inactiv separat și excluderea patrulelor.

## 3. Încasări și adeziuni

- [x] Adaugă evidența distinctă și auditată a alocărilor manuale la adeziune pe identitatea canonică.
- [x] Extinde înregistrarea și alocarea unei încasări fără dublare, inclusiv pentru mai mulți membri și destinații diferite.
- [x] Actualizează toate soldurile, limitele, corecțiile și restituirile pentru consumul comun al încasării.
- [x] Recunoaște adeziunile bancare în starea unică de plată, păstrând evidența online și sumele istorice confirmate.
- [x] Folosește apartenența explicită pentru tariful neplătit și tratează transferurile cu plăți în curs prin verificare.
- [x] Livrează fluxul simplu de încasare și statusul „Adeziune achitată”, cu operații financiare centralizate.

## 4. Validare și livrare

- [x] Testează matricea de acces și respingerea modificărilor neautorizate între structuri.
- [x] Testează încadrarea inițială, schimbările de nume și progresia locală fără destinație.
- [ ] Testează plățile istorice, alocările multiple, concurența, corecțiile, plățile în curs și separarea cotizației.
- [ ] Verifică migrarea și tranzacțiile pe PostgreSQL, fluxurile de browser, build-urile și OpenSpec strict.
- [ ] Livrează prin PR și verifică versiunea și sănătatea serviciilor din producție, conform autorizării existente.

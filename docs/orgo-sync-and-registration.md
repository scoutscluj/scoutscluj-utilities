# Înscriere și sincronizare Orgo

Implementarea locală este în branch-ul `codex/orgo-writeback-registration`. Acest document nu confirmă o lansare în producție.

## Fluxul de înscriere

`/login` → `/register` → cerere locală în așteptare → `/applications` → aprobare → operație persistentă de creare/asociere Orgo. Formularul cere data nașterii, școlarizare explicită (pregătitoare/0–12 sau „Nu sunt elev”) și acord. Pentru minori/datele copilului cere contacte distincte ale tutorelui. Nu solicită și nu stochează parola Orgo.

Adminii/super_admin pot crea, corecta, aproba, respinge și cere completări. Liderii/șefii cu mandat activ pentru întreaga unitate pot vedea și aproba cererile acelei unități. Un mandat de subunitate, ajutor sau expirat nu conferă acest drept. Cererile fără unitate se rezolvă de admin. Aprobarea nu acordă roluri tehnice de admin.

Identitatea se asociază numai prin ID Orgo confirmat și verificare nume/data nașterii/centru; numele sau emailul comun nu determină o fuziune. Contactele părintelui rămân locale în `member_guardians` și în profilul reutilizat pentru precompletarea activităților. Contactul nu oferă automat acces unui cont. Documentele și răspunsurile istorice nu se rescriu. Nu există în această livrare un portal autentificat al tutorelui sau o verificare automată a tutelei.

Orgo gestionează accesul inițial și notificările potrivit contractului său de înregistrare administrativă. Crearea unui copil fără email propriu și notificarea de bun venit trebuie confirmate cu tenantul înainte de activare; nu substituim emailul părintelui.

Formularul separă structura (Cluj / Florești) de ramura de vârstă. Ramurile sunt filtrate după structură, iar afilierea se păstrează și dacă solicitantul cere îndrumare. Confirmarea afișează pașii de verificare, aprobare, pregătire Orgo și autentificare, cu mesaje distincte pentru părinte și membru și pentru copilul fără email.

Emailul propriu al membrului este normalizat și verificat înainte de acceptarea cererii în conturile locale, profilurile membrilor, cererile active și Orgo. Emailul tutorelui rămâne reutilizabil pentru frați. Verificarea Orgo folosește `/api/v1/check-email-exists` cu tenantul identificat prin host; dacă nu se obține un răspuns boolean valid, cererea nu este acceptată. Workerul repetă verificarea înaintea primei tentative de creare, fără a substitui emailul părintelui și fără a asocia conturi după email. Cererile vechi păstrează compatibilitatea dacă nu conțin explicit structura în JSON.

## Activare

Aplică migrarea `Migration20261102000100` înaintea noii versiuni API. Ea adaugă cereri, contacte, outbox pentru obiecte și tokenuri de lease; păstrează contactele vechi ca neverificate și permite clasa 0. Nu trimite date în Orgo și nu reia istoricul automat.

Secretul de deployment acceptă următoarele chei, exemplificate în `.env.example`:

| Cheie | Utilizare |
| --- | --- |
| ORGO_API_TOKEN / ORGO_LOCAL_CENTER_ID | Token server și centrul fix |
| ORGO_MEMBER_WRITES_ENABLED=true | Profil, lifecycle, roluri și repartizări |
| ORGO_MEMBER_CREATION_ENABLED=true | Creare după aprobare; drept HR_LOCAL conform contractului |
| ORGO_ACTIVE_STATUS / ORGO_WITHDRAWN_STATUS | Coduri lifecycle confirmate; retragerea nu ghicește un cod |
| ORGO_GRADE_FIELD_ID | ID și tip custom verificate pentru clasă |
| ORGO_OBJECT_WRITES_ENABLED=true | Evenimente, participări și structuri |
| ORGO_EVENT_UNIT_ID | Unitate Orgo a centrului pentru evenimente |
| ORGO_UNIT_TYPE_MAP | Obiect JSON de forma `unit:temerari`/`subunit:temerari` → ID unit_type verificat |
| ORGO_UNIT_ARCHIVED_STATUS | Cod verificat pentru arhivarea structurii |
| ORGO_EVENT_STATUS_MAP | Mapări pentru stările locale cancelled/completed; draft/published au contract dedicat |
| ORGO_ATTENDANCE_STATUS_MAP | Stare locală → statusRegistration verificat în tenant; pending nu poate deveni success |

Flagurile noi sunt dezactivate implicit. Lipsele și refuzurile apar în `/admin/orgo-sync`; nu sunt raportate drept reușite. Verificarea tokenului pentru profil și cele trei atribuiri Lider confirmate anterior nu dovedesc permisiuni pentru toate endpointurile. Nu crea persoane sau tranzacții reale pentru a descoperi contractul. Pentru activare, folosește un tenant de test sau operații reale solicitate și confirmă readbackul separat pentru fiecare capabilitate.

## Procesare și recuperare

Un singur worker procesează outboxurile. Mutațiile obiectelor emit joburi în aceeași tranzacție PostgreSQL prin trigger, inclusiv publicare și ștergerea înscrierilor. Datele private ale formularelor nu se exportă. Ștergerea unei înscrieri deja trimise cere maparea anulării; una netrimisă nu creează o participare nouă.

Lease-urile persistente și heartbeatul coordonează procesele; există serializare per membru/obiect. POST-urile au marker persistent înainte de trimitere. După timeout, recitirea și asocierea ID-ului sunt preferate unei alte creări. Administratorul poate confirma absența unui obiect/rol cu dovada verificării înainte de a permite o nouă creare. Pentru conturi cu rezultat incert se asociază un ID verificat; nu se repetă POST-ul automat.

`/admin/orgo-sync` arată stări și comparații cu Orgo înaintea reluării istoricului. Previzualizarea este versionată. Operațiile deja confirmate, inclusiv cele trei roluri Lider, nu se reiau. Conflictele de câmp păstrează valoarea Orgo. Rolurile se adaugă individual și se încheie cu dată; nu înlocuim întregul set de roluri.

La fiecare bootstrap autentificat, aplicația cere o actualizare inbound neblocantă. Jobul per centru, lease-ul și backofful sunt comune tuturor taburilor/proceselor. Navigarea SPA și pollingul nu cer o nouă importare. Formularele deschise nu sunt invalidate global. Lookupurile ID/card verifică exact identitatea în Orgo pe lipsă/afiliere neconfirmată și reevaluează accesul/eligibilitatea; o eroare remote nu devine „membru inexistent”.

Plățile naționale folosesc fluxul existent, actorul autorizat și perioada exactă. Sincronizarea noilor obiecte nu încasează și nu restituie bani. Încasările activităților, acordurile semnate și contabilitatea locală nu sunt convertite arbitrar în plăți sau aprobări naționale.

## Verificare și revenire

Rulează testele API, typecheck/build API, svelte-check/build web, Playwright cu `playwright.admissions.config.ts` și testul PostgreSQL `apps/api/test/orgo-registration-migration.mjs` (necesită `@electric-sql/pglite`, sau `PGLITE_RUNTIME_PATH` către runtime). Testele folosesc identități sintetice și nu trimit cereri în producție.

Pentru oprirea writebackului, dezactivează flagurile de scriere/creare; joburile și dovezile rămân persistente. Nu șterge markerii unui rezultat incert și nu șterge identitățile create pentru rollback. Păstrează migrarea aditivă la revenirea binarului; operațiile remote deja confirmate necesită o corecție explicită, nu un rollback SQL.

Verificare locală din 2 noiembrie 2026: 53 suite/545 teste API trecute, 2 teste Playwright trecute, migrare PostgreSQL/PGLite trecută, ESLint fără erori pe fișierele API modificate, svelte-check fără erori/avertismente, build API și build web trecute, OpenSpec strict valid. Producția și secretul runtime nu au fost modificate pentru această livrare.

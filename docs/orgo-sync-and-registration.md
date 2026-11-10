# Înscriere și sincronizare Orgo

Documentul descrie fluxul de înscriere și contractele Orgo verificate. Starea publicării fiecărei modificări este urmărită în PR și în verificarea deploymentului.

## Fluxul de înscriere

`/login` → `/register` → cerere locală în așteptare → `/applications` → aprobare → operație persistentă de creare/asociere Orgo. Formularul cere data nașterii, școlarizare explicită (pregătitoare/0–12 sau „Nu sunt elev”) și acord. Pentru minori cere contacte ale tutorelui, păstrate separat de identitatea contului. Nu solicită și nu stochează parola Orgo.

Adminii/super_admin pot crea, corecta, aproba, respinge și cere completări. Liderii/șefii cu mandat activ pentru întreaga unitate pot vedea și aproba cererile acelei unități. Un mandat de subunitate, ajutor sau expirat nu conferă acest drept. Cererile fără unitate se rezolvă de admin. Aprobarea nu acordă roluri tehnice de admin.

Identitatea se asociază numai prin ID Orgo confirmat și verificare nume/data nașterii/centru; numele sau emailul comun nu determină o fuziune. Contactele părintelui rămân locale în `member_guardians` și în profilul reutilizat pentru precompletarea activităților. Contactul nu oferă automat acces unui cont. Documentele și răspunsurile istorice nu se rescriu. Nu există în această livrare un portal autentificat al tutorelui sau o verificare automată a tutelei.

Orgo gestionează accesul inițial și notificările potrivit contractului său de înregistrare administrativă. Pentru cererile noi emailul contului este explicit și obligatoriu; părintele poate alege o adresă proprie neutilizată de alt cont. Nu substituim automat contactul tutorelui.

Formularul separă structura (Cluj / Florești) de ramura de vârstă. Ramurile sunt filtrate după structură, iar afilierea se păstrează și dacă solicitantul cere îndrumare. Confirmarea afișează pașii de verificare, aprobare, pregătire Orgo și autentificare, cu mesaje distincte pentru părinte și membru și pentru copilul fără email.

Emailul propriu al membrului este normalizat și verificat înainte de acceptarea cererii în conturile locale, profilurile membrilor, cererile active și Orgo. Emailul de contact al tutorelui rămâne reutilizabil pentru frați; fiecare cont de membru are însă o adresă unică. Verificarea Orgo folosește filtrul exact `/api/v1/users?email=...`, confirmat pe instanța reală cu adresă existentă și adresă sintetică absentă. Un rezultat incomplet sau un filtru ignorat oprește verificarea. Endpointul public `check-email-exists` a returnat HTTP 400 pentru adrese noi și nu este folosit. Workerul repetă verificarea înaintea primei tentative de creare, fără a substitui emailul părintelui și fără a asocia conturi după email. Cererile vechi păstrează compatibilitatea dacă nu conțin explicit structura în JSON.

## Activare

### Înscriere adaptată și acces direct — 10 noiembrie 2026

Formularul începe cu alegerea înscrierii pentru sine sau pentru copil/altă
persoană. Genul este obligatoriu, fotografia este opțională (JPG/PNG/WebP,
maximum 2 MB). Emailul contului este obligatoriu și unic: pentru un copil poate
fi o adresă a părintelui neutilizată de alt cont. Contactul tutorelui rămâne
separat și poate coincide cu adresa contului copilului. Un alt copil are nevoie
de altă adresă de cont. Minorii au nevoie de contactul tutorelui în ambele
moduri; înscrierea altui adult colectează separat contactul completantului.

Fotografia este păstrată privat în cererea locală, exclusă din SQL-ul listei și
servită numai prin endpoint autorizat în aceeași arie de verificare. După
aprobarea și corelarea identității Orgo, se creează o operație foto separată,
cu readback; o eroare foto nu reia crearea contului. Genul este transmis direct
în payloadul de creare și verificat la recitire. Cererile istorice rămân lizibile.

Un cont sintetic creat cu autorizarea utilizatorului a confirmat status ACTIVE
și toate cele patru câmpuri obligatorii. Utilizatorul a verificat primul acces
prin „Connect with Orgo” cu cod primit pe email: a ajuns direct în Resurse fără
configurarea parolei sau a profilului în membri.scout.ro. Google era disponibil
ca alternativă, dar proba completă a folosit codul pe email. Separat, uploadul
unei imagini sintetice pe același cont a returnat HTTP 201, iar fotografia
recitită a coincis cu `contentUrl`; nu au fost modificate alte profiluri.

Butonul „Copiază instrucțiunile” folosește același mesaj în formular și în
confirmare, fără datele personale ale solicitantului. Tutorialul se adaugă
numai după publicarea unui URL real. Registrul oferă „Cereri noi (N)” pentru
cererile pending din aria de aprobare; numărul nu este limitat la cele 500 de
cereri încărcate în listă. Cererile pending sunt afișate primele.

### Profil complet și primul acces — verificare din 10 noiembrie 2026

Documentația oficială pentru [crearea administrativă](https://orgo.space/docs/api-reference/user/register-a-member-as-admin) precizează că endpointul setează `forcePasswordReset` și trimite emailul de configurare. Testul real descris mai sus confirmă însă primul acces prin cod pe email fără configurarea unei parole. Nu trebuie marcată o parolă sau un acord ca fiind ales de utilizator dacă acesta nu l-a ales.

Schema oficială `User-user_write_register_by_admin` din [OpenAPI](https://orgo.space/docs/api-reference/openapi.json) include `gender`, `address`, `postalCode`, `townCurrent`, `townFrom`, `timezone` și `bio`. Localitățile sunt referințe IRI, de exemplu `/api/v1/towns/{id}`; catalogul `GET /api/v1/towns` permite filtrare după `name` și `country`. Fotografia nu apare în schema de creare; integrarea existentă folosește separat uploadul media asociat membrului. Nu presupunem că toate proprietățile unui profil citit sunt acceptate de endpointul de creare.

Citirea configurației reale a tenantului a confirmat că `profileFieldsMandatory` conține numai `first_name`, `last_name`, `birthday`, `gender`, fără câmpuri personalizate obligatorii. Primele trei erau deja trimise; noul formular adaugă genul. Fotografia și localitățile sunt afișate pe profil, însă nu sunt obligatorii în această configurație. `defaultStatusForAdminRegistration` este `ACTIVE`. Acestea sunt observații de configurare, nu o modificare a setărilor.

Conform [Profile Fields](https://orgo.space/docs/platform/users/profile-fields), pagina `/hello-member` poate include și preferințe de confidențialitate, notificări, fus orar, grupuri sau documente nesemnate. Un profil complet nu garantează absența tuturor acestor pași. Verificarea inițială a fost numai în citire; testul ulterior de mai sus a folosit un cont sintetic autorizat explicit de utilizator.

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

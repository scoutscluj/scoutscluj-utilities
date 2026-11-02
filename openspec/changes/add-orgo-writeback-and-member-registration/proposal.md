# Sincronizare către Orgo și înscriere în centrul local

## Why

Modificările din Resurse care au echivalent Orgo trebuie livrate automat, cu
confirmare vizibilă. În prezent rolurile și repartizările sunt păstrate local,
iar înscrierea în centrul local nu este disponibilă din pagina de autentificare.

Pe 2 noiembrie 2026, tokenul API din producție a confirmat editarea profilurilor
și adăugarea rolului Lider la unitatea Orgo Temerari (137). Aceste probe nu
demonstrează încă dreptul de creare conturi, retragere, evenimente sau plăți.

## What Changes

- Inventar complet al operațiilor din Resurse și al echivalentelor Orgo:
  identități, fișe, fotografii, statusuri, tipuri, unități, responsabilități,
  progresie, activități, participanți și operațiile financiare corespunzătoare.
  Echivalența cere aceeași semnificație, centru, identitate și vizibilitate;
  simpla existență a unui endpoint cu un nume asemănător nu este suficientă.
- Trimitere automată prin outbox durabil după orice cale de editare, inclusiv
  operații în masă și joburi. Confirmarea cere recitire din Orgo.
- Rolurile se adaugă sau încheie păstrând rolurile fără legătură și istoricul;
  transferurile și retragerea nu acordă sau reactivează privilegii din greșeală.
- Pagina `/login` oferă „Înscrie-te”; `/register` depune o cerere pentru centrul
  configurat pe server. Adminii pot crea cereri și le pot valida sau respinge.
  Liderii și șeful unității solicitate pot vedea și confirma cererile pentru
  acea unitate, fără drepturi asupra cererilor altor unități.
- Data nașterii este obligatorie și determină vârsta. Alegerea clasei este
  obligatorie: pregătitoare, I–XII sau „Nu sunt elev”.
- Pentru copii, părintele/tutorele poate depune cererea; contactele și legătura
  cu copilul se păstrează local și se refolosesc la activități și acorduri.
- Contul Orgo se creează sau se asociază numai după validare de către un admin
  sau un lider autorizat al unității solicitate.
  Autentificarea rămâne prin Orgo; nu introducem o parolă separată în Resurse.
- Stare și audit pentru fiecare livrare; erorile de contract sau permisiuni
  rămân vizibile. Fără mesaje de succes pentru date care nu au ajuns în Orgo.
- Înainte de un refuz bazat pe ID absent sau apartenență locală neconfirmată,
  se verifică identitatea exactă în Orgo și se reevaluează operația pe datele
  confirmate. Indisponibilitatea Orgo nu este interpretată ca lipsa membrului.
- Fiecare deschidere/reîncărcare a aplicației autentificate solicită o
  sincronizare din Orgo în fundal. Încărcările simultane folosesc același job,
  iar navigarea între pagini nu declanșează importuri complete repetate.

## Decisions confirmed with the user

1. Cererea publică rămâne în Resurse până la validarea unui admin sau a unui
   lider autorizat al unității solicitate; abia apoi creăm/asociem contul Orgo.
2. Data nașterii și alegerea clasei sunt obligatorii; „Nu sunt elev” permite
   înscrierea preșcolarilor și adulților.
3. Părintele/tutorele poate înscrie copilul. Datele părintelui rămân locale și
   sunt reutilizabile pentru înscrieri la activități și alte fluxuri locale.
4. Liderii unității în care persoana solicită înscrierea pot confirma cererea.
   Dreptul este limitat la unitatea respectivă și necesită un mandat activ.
5. Când un ID nu este găsit sau membrul pare din afara centrului, verificăm
   direct în Orgo înainte de concluzie. La încărcarea aplicației solicităm și
   actualizarea din Orgo în fundal.

## Proposed defaults for review

- Admin și super_admin pot crea/valida înscrieri în întregul centru. Liderii și
  șefii cu mandat activ pot confirma cererile propriei unități. Cererile fără
  unitate se rezolvă de admin. Drepturile de administrare a rolurilor aplicației
  rămân separate de acceptarea unui membru.
- Centrul Orgo este fixat server-side; nu se poate înscrie în alt centru prin
  modificarea formularului. Cluj/Florești rămân structuri locale explicite.
- Notițele interne, contactele părintelui, datele medicale fără câmp cu acces
  echivalent și evidențele contabile locale nu se publică în Orgo.
- Plățile naționale păstrează confirmarea responsabilului financiar și
  mecanismul existent cu tokenul actorului. Sincronizarea nu efectuează
  transferuri bancare și nu dublează încasări sau aprobări naționale.
- Noile editări se sincronizează automat. Operațiile istorice primesc o
  previzualizare după recitire, înainte de reluare; nu redăm orbește intenții vechi.

## Impact

API NestJS, outbox/worker, contracte Orgo, migrare aditivă PostgreSQL, pagini
SvelteKit publice și de administrare, fișa membrului și precompletarea
înscrierilor la activități. Se păstrează istoricul financiar și documentele.
Inventarul de integrare este în `operation-matrix.md`; execuția în `tasks.md`.

## Approval

Aprobată de utilizator pe 2 noiembrie 2026 prin „de acord. implementeaza”,
inclusiv validarea de către liderii unității, verificarea punctuală în Orgo
și sincronizarea inbound la încărcarea aplicației. Implementarea nu autorizează
crearea unor conturi reale sau tranzacții pentru descoperirea contractelor.

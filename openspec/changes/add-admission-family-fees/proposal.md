# Identificarea familiei la înscriere și cotizația noului membru

## Why

Contactul părintelui trebuie să ajute centrul să identifice familiile și să
aloce cotizația potrivită noului membru. Această asociere financiară nu trebuie
confundată cu accesul la contul copilului și nu trebuie publicată în Bio.
Formularul trebuie să păstreze explicațiile scurte și o încărcare foto intuitivă.

## Decisions confirmed on 10 November 2026

- Numărăm toți membrii activi ai familiei care sunt supuși cotizației, inclusiv
  părintele dacă este cercetaș și membrii care au plătit deja.
- Păstrăm ordinea și încadrările existente. Noul membru primește următorul nivel:
  fam1 pentru primul, fam2 pentru al doilea, fam3 pentru al treilea și următorii.
  Nu recalculăm plățile sau încasările existente.
- Identificarea folosește atât emailurile membrilor, cât și contactele de părinte
  deja salvate la alți copii; părintele nu trebuie să fie el însuși cercetaș.
- Asocierea servește cotizației și contactelor. Nu acordăm automat acces la
  contul copilului și nu creăm relații Orgo care conferă asemenea drepturi.
- Familia sugerată și cotizația propusă apar numai în verificarea internă a
  cererii, nu în formularul public.

## What Changes

1. Pentru orice minor, inclusiv înscriere pentru sine, păstrăm obligatorii numele,
   telefonul și emailul părintelui/tutorelui. Simplificăm etichetele vizibile.
2. Căutăm familia în centrul local (Cluj și Florești), prin email normalizat și
   relațiile locale existente. Potrivirile sunt sugestii până la aprobarea
   cererii. Un rezultat ambiguu necesită rezolvare internă și nu unește automat
   familii sau identități. Formularul public nu dezvăluie existența unui membru.
3. Verificarea cererii afișează familia și nivelul propus, în limitele accesului
   actorului. Aprobarea existentă confirmă și această încadrare; nu adăugăm un pas
   pentru părintele care completează formularul.
4. Persistăm asocierea și ordinea, cu audit și protecție la reluarea cererilor și
   aprobări concurente. Un membru asociat deja prin ID Orgo nu este numărat de
   două ori. Aprobările în curs de creare a contului rezervă nivelul atribuit,
   pentru a evita acordarea aceleiași poziții la două înscrieri simultane.
5. Aplicăm cotizația numai noului membru, cu prețurile și catalogul Orgo curent,
   folosind câmpul dedicat cotizației și confirmarea prin recitire. Membrii deja
   existenți, tarifele lor speciale, plățile, checkouturile și perioadele
   istorice rămân intacte. Corecțiile financiare existente își păstrează regulile.
6. Datele părintelui și asocierea familiei rămân private în Resurse și nu intră
   niciodată în Bio. Exportul contactelor poate folosi numai câmpuri dedicate,
   verificate ca echivalente și cu acces potrivit; lipsa lor păstrează datele
   local, fără crearea automată a câmpurilor în platforma națională.
7. Fotografia se alege dintr-o zonă circulară roșie, cu inițiale actualizate pe
   măsură ce este completat numele. Fotografia înlocuiește inițialele. Păstrăm
   previzualizarea, înlocuirea, eliminarea, validarea și sincronizarea existente.
8. Textul foto explică pe scurt că ne ajută să recunoaștem persoana la început.
   Explicațiile mai ample de la fotografie și email se deschid din pictograme
   info accesibile prin mouse, tastatură și atingere.
9. Conform instrucțiunii ulterioare, publicăm întâi familia și formularul.
   Tutorialul muzical animat și linkul său urmează separat după această publicare.

## Verified Orgo contract

Citirea configurației reale pe 10 noiembrie 2026 a găsit numai trei câmpuri
personalizate: Alimentație, Alergii și Alte nevoi, toate marcate public. Nu există
câmpuri dedicate pentru numele, telefonul sau emailul părintelui. Nici schema
administrativă de creare nu expune asemenea câmpuri. Prin urmare, în configurația
actuală contactele vor rămâne numai în Resurse. Nu reutilizăm câmpurile medicale.

Orgo are o funcție separată Family Members care poate conferi acces părintelui;
aceasta este exclusă din schimbare. Cotizația are deja contract verificat prin
`feeTenantProductPrice` și catalogul curent; nu folosim Bio drept substitut.

## Impact and rollout

API: reguli de identificare/încadrare, asociere familială privată, audit, outbox
pentru încadrarea noului membru și migrare aditivă dacă modelul existent nu poate
păstra relația și ordinea. Web: formular, previzualizarea cererii și mesaje de
sincronizare. Teste pentru concurență, reluări, ambiguități, confidențialitate și
păstrarea încasărilor. Tutorialul și schimbările formularului se publică împreună
după verificare, prin PR, fără înscrieri reale suplimentare pentru testare.

## Approval

Utilizatorul a aprobat explicit propunerea și publicarea în producție pe 10 noiembrie 2026.

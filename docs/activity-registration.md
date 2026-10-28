# Înscrieri la activități

Pagina publică este `/activitati/<id>`, iar registrul coordonatorului este
`/activities/<id>/registrations`. Lista publică este disponibilă la `/activitati`,
inclusiv din pagina de autentificare. Setările noi sunt inițial nepublicate.

## Pregătirea activității

1. Completează perioada, locația și descrierea activității.
2. Deschide Înscrieri → Setări înscrieri → Acord parental și completează textele
   lungi specifice activității: coordonatori, program, transport, echipament,
   responsabili de prim ajutor și unități medicale. Numele, locația și perioada
   provin din activitate. Descarcă acordul de verificare după salvare.
3. Editorul global și vechiul wizard sunt suspendate temporar. Formatul fix este
   DOCX-ul primit pentru Temerari și Exploratori, cu paragrafele variabile înlocuite
   prin marcaje și păstrarea clauzelor, antetului, tabelelor și zonelor de semnătură.
   Publicarea setărilor păstrează automat o publicație imuabilă pentru înscrierile
   noi. Nu este necesar un draft sau activarea unui șablon global. Publicațiile și
   documentele înscrierilor vechi rămân intacte.
4. Configurează eligibilitatea, aprobarea, limitele de locuri, tarifele, tranșele,
   întrebările și condițiile publice. Publică pagina și distribuie linkul ei.
   Poți adăuga o imagine prin URL HTTPS. Folosește „Copiază linkul public” din
   registrul înscrierilor; linkul este `/activitati/<id>`.

Pagina publică separă înscrierea de plata unei înscrieri existente. La finalul
unei înscrieri noi de minor se pregătește PDF-ul completat; plata rămâne opțională
în acel moment. Membrii autentificați văd activitățile eligibile în submeniul
Activități, iar coordonatorii păstrează accesul la gestionarea activităților.

Rendererul formatului fix necesită `python3`, `python3-lxml`, LibreOffice Writer și
fonturile Liberation/Carlito, instalate în imaginea API și verificate prin CI.
Pentru dezvoltare se pot seta `PARENTAL_CONSENT_PYTHON` și `LIBREOFFICE_PATH`.
Fișierele temporare sunt izolate și eliminate, inclusiv după eșec. Semnătura și
data semnării nu sunt completate în numele reprezentantului legal.

Configurația nouă nu modifică retroactiv taxele sau tranșele înscrierilor existente.
Schimbările individuale de taxă și confirmarea familiei sunt operațiuni explicite,
cu istoric. Refuzul consimțămintelor foto nu afectează participarea.

## Identitate și date

Contul autentificat poate înscrie propria persoană sau alt membru prin ID Orgo.
Fără autentificare, formularul nu întoarce date din fișa membrului. Precompletarea
autentificată respectă accesul existent la fișa privată și datele medicale.
Informațiile reutilizabile lipsă pot proveni din înscrierea anterioară, cu aceleași
permisiuni. Consimțămintele și opțiunile specifice activității se aleg din nou.

Se păstrează o singură înscriere pentru aceeași activitate și același membru.
O cheie aleatoare de 256 de biți oferă acces la pagina personală; în înscriere
se păstrează numai hashul. Linkul este o credențială privată. Contul creatorului
și contul participantului pot reveni și prin lista înscrierilor din pagina publică.
O înscriere anonimă existentă nu poate fi preluată prin simpla repetare a ID-ului.

Coordonatorul și administratorii gestionează activitatea. Responsabilul financiar
primește situația încasărilor, fără răspunsuri medicale sau acorduri. Responsabilii
medicali desemnați au acces la informațiile necesare, fără registrul financiar.
Responsabilii administrativi desemnați pot verifica acordurile. Citirea fișei și
descărcarea documentelor sunt auditate; textele medicale nu intră în audit.

## Participare și capacitate

Participarea, plata și acordul au stări independente. Înscrierea poate fi în
așteptarea aprobării, pe lista de așteptare, cu loc rezervat, acceptată, retrasă
sau respinsă. Limitele pot acoperi beneficiarii, echipa adultă, ramura și totalul.
Locurile se alocă sub un lock PostgreSQL pe activitate, inclusiv între replici.
Participanții în așteptare nu pot iniția plata. Coordonatorul promovează explicit
un participant atunci când există un loc și decide eliberarea locurilor restante.

Echipa adultă doar anunță participarea. Se verifică majoratul și ultima versiune
a certificatului de integritate comportamentală pentru anul cercetășesc care
include începutul activității. Certificatul trebuie să fie validat; modelul existent
de certificate folosește anul cercetășesc, fără o dată individuală de expirare.
Beneficiarii majori urmează înscrierea și plata, fără acord parental.

## Încasări și familie

Tariful este stabilit de coordonator. Sugestia folosește comisionul configurat
pentru procesatorul selectat și rotunjirea în sus la 5 lei. Ea nu aplică automat
un supliment la checkout și nu introduce un preț diferit pentru plata cu cardul.
Încasările bancare/cash, susținerea CL și restituirile efectuate au evidențe distincte.
Corecțiile sunt înregistrări inverse, fără ștergerea originalului. Susținerea CL
reduce soldul, dar nu este numărată drept bani încasați.
Suma aprobată pentru restituire se stabilește separat de restituirile efectuate;
registrul arată suma rămasă de restituit. O retragere cu bani încasați și fără
decizie de restituire este semnalată pentru verificare.

Tipul de cotizație Fam 1/2/3 este un indiciu, nu o legătură demonstrată între
membri. Coordonatorul selectează rudele acceptate la aceeași activitate, în ordinea
tarifelor, și confirmă relația. Retragerea nu modifică automat taxa rudelor și nu
inițiază restituiri. Soldurile în plus rămân vizibile.

Plata cu cardul folosește configurația și revizia criptată NETOPIA/Stripe deja
existente. Încercările, încasările și documentele de activitate sunt în tabele proprii;
nu se creează obligații sau alocări de cotizație. Callback-urile existente sunt
rutate după proprietarul încercării, apoi semnătura și suma sunt verificate.
Repetarea ori concurența notificărilor nu dublează încasarea. Revenirea din browser
nu confirmă plata. Rezultatele necunoscute blochează o nouă încercare până la
verificare; pentru Stripe se poate solicita expirarea unei sesiuni neplătite.

## Acorduri

PDF-ul individual folosește publicația imuabilă și răspunsurile înscrierii.
Fiecare versiune generată și fiecare PDF semnat încărcat sunt păstrate cu SHA-256.
Modificarea răspunsurilor produce o versiune nouă și solicită un acord actualizat.
Un PDF semnat pentru răspunsuri anterioare nu poate confirma versiunea nouă.
Încărcarea unui PDF nu pretinde validarea criptografică a semnăturii: documentul
intră în verificare și este acceptat explicit de o persoană autorizată.
Alternativ, coordonatorul marchează primirea acordului fizic semnat.

După republicarea detaliilor activității, „Solicită acord actualizat” aplică noua
publicație înscrierilor afectate, păstrând toate documentele anterioare.

## Confirmări prin e-mail

Înscrierea și mesajul de confirmare sunt salvate în aceeași tranzacție. Workerul
procesează coada cu lease între replici și retry cu backoff. Trimiterea necesită
`WEB_ORIGIN`, `ACTIVITY_MAIL_ENDPOINT` și `ACTIVITY_MAIL_TOKEN` pe serviciul API.
Endpoint-ul HTTPS primește `POST {to, subject, text}`, autentificare Bearer și
`Idempotency-Key` stabil; transportul trebuie să deduplice aceeași cheie, inclusiv
după un timeout. Textul cu linkul personal este eliminat din coadă după livrare.
Fără transport configurat, mesajul rămâne în așteptare, vizibil în registru; pagina
personală funcționează imediat. Testele nu trimit mesaje către persoane reale.

## Verificare locală

- API: `pnpm --filter api typecheck` și testele Jest pentru înscrieri, callback-uri,
  renderer și compatibilitatea cotizațiilor.
- PostgreSQL: `pnpm --filter api test:activity-registration:postgres`. Scriptul
  refuză orice țintă în afara bazei dedicate `activity_registration_test` de pe
  `127.0.0.1:55437`; migrează schema și folosește exclusiv date sintetice.
  `pnpm --filter api test:activity-registration:module` verifică și dependențele
  modulului compilat NestJS, folosind aceeași bază izolată și fără a porni workerii.
- Web: `pnpm --filter web check` și `pnpm --filter web test:e2e:registration`.
  Playwright pornește un API sintetic, fără acces la procesatori sau date reale.
- PDF: `pnpm --filter api exec tsx src/modules/parental-consent/parental-consent-renderer.smoke.ts --registration-example`.
  Se randează și se inspectează toate paginile după schimbări de layout.

Migrarea este aditivă. Rollback-ul refuză ștergerea înscrierilor existente.
Orgo rămâne identitatea membrilor; această implementare nu inventează o integrare
de scriere a înscrierilor în Orgo.

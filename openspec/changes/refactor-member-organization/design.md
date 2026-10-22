# Design

## Modelul de domeniu

`Structură → Unitate fixă → Subunitate` este ierarhia organizațională. Categoria principală descrie apartenența membrului; responsabilitatea descrie ce gestionează, iar permisiunea descrie ce operații poate efectua. Categoria Lideri nu acordă singură drepturi de administrare.

Catalogul categoriilor are identificatori stabili pentru cele șapte valori. Există exact o unitate pentru fiecare pereche structură–categorie, inclusiv unități goale. Identitatea unităților este stabilă și protejată prin constrângeri în baza de date și absența operațiilor CRUD publice pentru catalog.

`ScoutUnit` reprezintă unitatea fixă; subunitățile primesc o entitate distinctă `ScoutSubunit`, cu nume, unitate părinte și stare de arhivare. Un membru are o structură principală, o categorie principală opțională până la clarificare și cel mult o subunitate principală. Unitatea rezultă din structură și categorie, fără o a doua valoare independentă care poate deveni inconsistentă. Validarea garantează că subunitatea aparține aceleiași structuri și categorii.

Responsabilitățile sunt atribuiri separate pe structură, unitate sau subunitate, cu rol, drepturi explicite, autor și perioadă de valabilitate. Un Senior care ajută Temerarii rămâne Senior. Un Lider poate avea responsabilități în mai multe unități. Rolurile de autorizare nu devin categorii principale.

Legăturile către unitățile Orgo se păstrează separat de catalogul fix: mai multe identificatoare sursă pot corespunde aceleiași unități sau unor subunități. Nu se presupune că un singur `orgoId` pe unitatea fixă este suficient.

## Acces și delegare

Orice acces la un membru trece întâi prin verificarea structurii, apoi prin verificarea operației. O responsabilitate în altă structură nu ocolește această regulă. Administratorul central/Consiliul din Cluj are mandat explicit pentru ambele structuri. Un administrator de structură sau șef de unitate din Cluj nu primește acest acces. Conturile neasociate ori cu afiliere neclară nu primesc implicit acces global; mandatele centrale existente se reconciliază explicit în migrare.

| Mandat                                | Gestionare                                 | Delegare                                                                                         |
| ------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Administrator central / Consiliu Cluj | Membri și subunități din ambele structuri  | Numește responsabilii structurilor; gestionează mandatele centrale și excepțiile între structuri |
| Responsabil structură                 | Membri și subunități din propria structură | Numește șefii unităților propriei structuri                                                      |
| Șef de unitate                        | Membri și subunități din propria unitate   | Desemnează lideri și ajutoare în subunitățile proprii, cu drepturi în limita mandatului          |
| Lider desemnat de subunitate          | Membrii subunității desemnate              | Fără redelegare                                                                                  |
| Ajutor, voluntar adult, scouter       | Numai operațiile acordate explicit         | Fără redelegare                                                                                  |

Validarea delegării verifică atât aria, cât și drepturile; nimeni nu poate acorda mai mult decât deține. Retragerea/expirarea mandatului elimină drepturile derivate fără a șterge istoricul atribuirilor. Transferul structurii principale rămâne o operație centrală, auditată.

Registrul de bază pentru adulții autentificați expune numele, categoria și subunitatea în structura proprie. Profilul complet, contactele, datele medicale, notele și cotizațiile folosesc proiecții și permisiuni distincte, păstrând regulile existente acolo unde sunt compatibile. Dreptul de a vedea registrul nu acordă acces la aceste date sau la administrarea financiară.

Aceeași politică server este reutilizată pentru listare, detalii, căutare, export, selecție multiplă și mutații. Identificatoarele trimise manual nu pot ocoli politica; operațiile în lot sunt validate integral înainte de scriere. Numărătorile și opțiunile filtrelor includ numai date accesibile. Sarcinile de fundal folosesc un context de sistem explicit și nu extind accesul utilizatorilor.

## Import și migrare

1. Adăugare de schemă și catalog fix, fără ștergerea datelor vechi; backfill idempotent.
2. Previzualizare cu afilierea propusă din numele normalizat și categoria explicită Orgo. Lipsurile/contradicțiile sunt marcate pentru verificare; vârsta și responsabilitățile nu substituie categoria importată.
3. Reconciliere a unităților vechi prin mapare explicită: unități echivalente catalogului se leagă de unitatea fixă; grupurile numite devin subunități când sensul este confirmat. Cazurile ambigue blochează conversia lor automată și apar în previzualizare.
4. Confirmare centrală a mapării și excepțiilor; persistarea afilierii și categoriei, audit cu valorile înainte/după și legături de migrare.
5. Migrarea responsabilităților și reconfirmarea mandatelor care altfel ar încălca izolarea structurilor. Nicio responsabilitate veche nu devine automat mandat central.
6. Verificarea referințelor și totalurilor, apoi activarea citirilor noi. Păstrarea structurii vechi până la validarea conversiei și posibilitatea revenirii aplicației fără pierderea datelor.

Identificatorii membrilor și referințele financiare rămân stabile. Documentele, notele, istoricul și sumele nu se rescriu pentru a reflecta noua clasificare. Operațiile care ating clasificarea financiară păstrează ordinea existentă a blocărilor și tranzacțiilor. Sincronizarea ulterioară păstrează editările locale și mecanismul de conflicte; nu recalculează structura din nume.

Progresia anuală rămâne controlată de setarea existentă și folosește doar regulile pentru cele patru categorii de vârstă. Nu transformă automat un Senior în Lider, Voluntar adult sau Scouter. Destinațiile lipsă ori ambigue necesită verificare.

## Interfață

Paginile de membri și unități devin punctele unice de lucru. API returnează capabilități pentru fiecare element/operație; frontendul le folosește pentru afișarea butoanelor, iar serverul le reverifică la execuție. Adăugarea folosește un buton plus disponibil numai celor autorizați; editarea, repartizarea și arhivarea folosesc meniuri contextuale și dialoguri.

Tabelele păstrează formatul comun compact: căutare, filtre, rânduri pe pagină și coloane pe aceeași linie când spațiul permite; adaptare pe ecrane mici; intervalul afișat și totalul accesibil/filtrat; selecție în antet, fără butonul duplicat „Selectează toate rezultatele”. Opțiunile comune de paginare includ 25, 50, 100 și 250. Filtrele pentru categorie și subunitate sunt distincte; „Nerepartizat” nu ascunde categoria, iar „De verificat” este o stare de calitate a datelor.

Submeniurile de administrare a membrilor/unităților dispar. Vechile rute GET redirecționează către pagina comună și contextul relevant; formularele și endpointurile de mutație sunt migrate explicit, cu aceeași politică de autorizare. Restul administrării aplicației rămâne separat.

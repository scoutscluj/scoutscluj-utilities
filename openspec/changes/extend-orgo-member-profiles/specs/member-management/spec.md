## ADDED Requirements

### Requirement: Importul rolurilor și al fișei detaliate Orgo

Sistemul SHALL importa tipul membrului, funcțiile active și informațiile de
profil disponibile prin tokenul serverului, inclusiv fotografia. Consiliul SHALL
vedea și confirma accesul rezultat înainte de aplicarea rolurilor.

#### Scenario: Lider existent fără data promisiunii

- **WHEN** fișa Orgo indică tipul Lider, dar nu oferă data promisiunii
- **THEN** importul păstrează confirmarea și proveniența ei fără o dată fictivă
- **AND** verificările de vârstă și incompatibilitățile de rol rămân obligatorii

#### Scenario: Funcție dintr-o patrulă

- **WHEN** o funcție Orgo este asociată unei patrule excluse din import
- **THEN** funcția nu creează o unitate, grupă sau permisiune în Resurse

### Requirement: Editarea profilului extins

Sistemul SHALL permite editarea câmpurilor de profil și fotografiei în limitele
drepturilor existente și SHALL distinge datele editabile de cele informative.

#### Scenario: Scriere nesuportată de token

- **WHEN** Orgo nu permite sincronizarea unui câmp modificat local
- **THEN** valoarea locală este păstrată cu o stare explicită de nesincronizare
- **AND** interfața nu raportează succes remote și nu folosește automat tokenul SSO

### Requirement: Reconcilierea modificărilor concurente

Sistemul SHALL verifica Orgo zilnic și la cerere și SHALL reconcilia valorile
pe câmp folosind ultima bază comună.

#### Scenario: Ambele sisteme modifică același câmp diferit

- **WHEN** valoarea locală și cea Orgo diferă între ele și de baza comună
- **THEN** ambele variante sunt păstrate pentru alegere manuală
- **AND** celelalte câmpuri fără conflicte se pot actualiza automat

### Requirement: Editarea registrului individual și în lot

Sistemul SHALL permite editarea clasei, unității/grupei și statusului direct din
tabel, individual și în lot, în limitele permisiunilor fiecărui membru.

#### Scenario: Un membru din lot nu mai poate fi modificat

- **WHEN** la aplicarea lotului o revizie sau o permisiune diferă de previzualizare
- **THEN** lotul este respins fără modificări parțiale
- **AND** utilizatorul primește explicația și poate reface previzualizarea

### Requirement: Transferul tuturor membrilor selectați la Florești

Consiliul SHALL putea selecta toate rezultatele filtrate, inclusiv de pe alte
pagini, și confirma transferul lor în lot la Florești.

#### Scenario: Filtrul găsește membri pe mai multe pagini

- **WHEN** Consiliul selectează toate rezultatele și alege transferul la Florești
- **THEN** previzualizarea include toate persoanele, numărul și repartizările afectate
- **AND** confirmarea folosește setul și reviziile din previzualizare

### Requirement: Confirmarea inactivilor ca retrași

Un gestionar autorizat SHALL putea confirma membrii importați ca inactivi drept
retrași, individual sau în lot, fără aprobare suplimentară.

#### Scenario: Confirmare urmată de un nou import

- **WHEN** un membru inactiv a fost confirmat retras și este importat din nou
- **THEN** confirmarea locală și istoricul sunt păstrate
- **AND** nu sunt create datorii istorice sau implicări active

### Requirement: Confirmarea cotizației locale când naționalul este plătit direct

Operatorii financiari SHALL putea verifica plata națională în Orgo și asocia
încasarea locală din meniul contextual al membrului, pentru perioada aleasă.

#### Scenario: Național confirmat și partea locală primită prin bancă

- **WHEN** Orgo confirmă plata națională pentru intervalul exact și operatorul
  asociază suma locală dintr-o încasare bancară
- **THEN** cotizația recunoaște ambele componente fără încasare națională fictivă
- **AND** partea națională nu poate fi transferată din nou în loturile centrului

#### Scenario: Operația este repetată

- **WHEN** aceeași confirmare este trimisă din nou
- **THEN** acoperirea externă și alocarea bancară nu sunt dublate

### Requirement: Cotizațiile membrilor vizibili în registru

Sistemul SHALL permite consultarea cotizației oricărui membru deja vizibil în
registru, fără acordarea implicită a drepturilor financiare de modificare.

#### Scenario: Voluntar cu acces la un membru

- **WHEN** voluntarul deschide cotizația unui membru pe care îl poate vedea
- **THEN** vede situația locală și națională pentru acel membru
- **AND** nu primește date bancare sau acces la membri din afara ariei sale

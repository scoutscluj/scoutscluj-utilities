# Florești și adeziunile achitate prin bancă

## Why

Florești este un centru local în formare, cu Lupișori și Temerari, aflat în
evidența actuală a Clujului. Apartenența trebuie să fie explicită și să permită
creșterea structurii. Numele din Orgo sunt suficiente pentru o propunere inițială
de încadrare, dar nu trebuie să determine permanent organizarea sau tariful.

Există și adeziuni deja plătite prin transfer bancar, încă neînregistrate în
aplicație. Fluxul actual alocă încasările manuale cotizațiilor și recunoaște
adeziunea prin checkout online; trebuie să recunoască și aceste plăți bancare.

Propunerea consolidează interviul din 20 octombrie 2026. Utilizatorul a cerut
oprirea întrebărilor de detaliu; alegerile tehnice și cazurile uzuale sunt
rezolvate conservator în design. Funcționalitatea nu este încă implementată.

## What Changes

- Cluj și Florești devin structuri locale explicite, cu membri și unități proprii.
  Fiecare membru are o apartenență principală; responsabilitățile unui adult
  pot acoperi unități din ambele structuri.
- Responsabilii Florești gestionează unitățile și membrii structurii lor.
  Consiliul Cluj păstrează acces la ambele. Responsabilii locali pot vedea
  statusul cotizațiilor; operațiunile financiare rămân centralizate la Cluj.
- Rolul de responsabil de structură poate fi acordat unui adult desemnat de
  Consiliu, fără cerința promisiunii de lider. Nu înlocuiește cerințele pentru
  lideri sau șefi de unitate și nu acordă rolul global de administrator.
- Doar Consiliul Cluj transferă apartenența între structuri și atribuie unui
  adult responsabilități în cealaltă structură. Responsabilii locali și șefii
  gestionează repartizările interne, în limitele rolului lor.
- La încadrarea inițială, numele care conțin „Florești”, inclusiv variante fără
  diacritice, propun apartenența Florești. Consiliul verifică și confirmă
  încadrarea. Modificările ulterioare ale numelui nu mută persoana automat.
- Actualizarea anuală caută destinații în aceeași structură. Când ramura
  următoare lipsește în Florești, persoana rămâne în evidența Florești, cu o
  tranziție de rezolvat manual; nu este transferată automat la Cluj.
- Încasările din extrase se înregistrează cu suma, data și referința lor și
  se alocă membrilor, cu destinația „Adeziune” sau „Cotizație”. O încasare poate
  acoperi mai mulți membri și ambele destinații, în limita sumei primite.
- Adeziunea bancară confirmată apare achitată în fișă și în fluxurile de plată,
  fără crearea unei încasări duplicate sau a unui checkout online fictiv.
  Plățile istorice confirmate își păstrează suma și nu sunt cerute din nou.
- Tariful adeziunii încă neplătite urmează apartenența explicită. Transferul
  păstrează sumele deja achitate și semnalează plățile în curs pentru verificare.
- Interfața păstrează un singur registru, cu filtre simple pentru structură și
  unitate, opțiuni limitate la accesul utilizatorului și un flux scurt pentru
  înregistrarea încasărilor. Inactivii rămân într-o secțiune separată; patrulele
  Orgo rămân excluse.

## Impact

- API: membri, responsabilități, politici de acces, tranziții anuale, import
  Orgo, încasări, alocări și recunoașterea adeziunii pe identitatea canonică.
- Web: registrul și fișele membrilor, configurarea structurii, atribuirea
  responsabililor, încasările manuale și alocările financiare.
- Bază: migrare aditivă pentru apartenențe și roluri locale, plus evidența
  distinctă a adeziunilor manuale. Migrarea nu schimbă plăți confirmate și nu
  aplică automat încadrarea după nume asupra datelor reale.
- Audit și teste: limitele dintre structuri, repartizările adulților,
  încadrarea inițială, progresia și reconcilierea plăților bancare.

## Scope Boundaries

Desprinderea formală a Floreștiului ca centru independent va fi discutată atunci.
Direcția agreată în principiu este păstrarea aceleiași platforme, cu administrare
și date separate. Această livrare pregătește apartenențele explicite, fără să
introducă acum întregul model de centre independente.

Nu sunt necesare un parser nou de extrase PDF, reconciliere automată după numele
plătitorului sau încărcarea obligatorie a unui fișier pentru a asocia plata.
Referințele către documentele financiare existente pot fi păstrate. Limitările
documentate ale sincronizării complete Orgo nu sunt declarate rezolvate de
această propunere.

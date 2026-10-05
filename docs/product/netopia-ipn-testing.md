# Verificarea notificărilor NETOPIA

Configurația plății și cheia de verificare IPN au surse separate. API key,
semnătura POS și mediul plății sunt păstrate în reviziile criptate existente,
configurate în Administrare financiară → Procesator de plăți. Nu este nevoie
de migrare și nu se schimbă credentialele existente.

## Fișiere modificate

- `.env.example`: cheia publică furnizată, în format cu `\n`.
- `apps/api/src/modules/membership/netopia.service.ts`: sursa comună a cheii,
  normalizarea tokenului, validările JWT și logging fără credentiale.
- `apps/api/src/modules/membership/netopia.service.spec.ts`: regresia cheii
  istorice, semnături RSA, timp/format și separarea inițierii LIVE/SANDBOX.
- `apps/api/src/modules/membership/membership.service.ts`: validări suplimentare
  ale tranzacției, logging și identificarea duplicatelor în loguri.
- `apps/api/src/modules/membership/membership.service.spec.ts`: procesare cu
  semnături reale și teste HTTP pe controllerul existent.
- `apps/api/src/modules/membership/membership.controller.ts`: log pentru
  token/corp lipsă; ruta publică și HTTP 200 existente sunt păstrate.
- `apps/api/src/modules/membership/payment-configuration.service.ts`: cheia
  IPN nu mai este cerută sau salvată în reviziile credentialelor de plată.
- `apps/api/src/modules/membership/payment-configuration.service.spec.ts`:
  teste pentru configurațiile de plată fără cheia IPN.
- `apps/api/src/modules/membership/payment-provider.ts`: compatibilitate cu
  câmpul `publicKey` din reviziile vechi, ignorat la verificare.
- `apps/web/src/routes/(app)/admin/finance/payment-processor/+page.svelte`:
  eliminarea câmpului de cheie IPN din configurația fiecărui mediu.
- `docs/product/netopia-activation-checklist.md`: configurarea IPN separată.
- `docs/product/netopia-ipn-testing.md`: explicația patch-ului și retestarea.

## Cauza identificată și corecția

Anterior, verificarea JWT folosea `publicKey` din revizia de configurare a
plății. O revizie cu o cheie nepotrivită producea `Unauthorized`, inclusiv după
corectarea configurației active. Testul de regresie reproduce această eroare
pentru LIVE și SANDBOX. Fără un IPN real și configurația din hosting nu putem
confirma că aceasta este singura cauză a notificării raportate de NETOPIA.

Acum, verificarea folosește exclusiv `NETOPIA_IPN_PUBLIC_KEY`. Câmpul istoric
`publicKey` rămâne compatibil cu datele criptate vechi, dar este ignorat; noile
revizii păstrează doar credentialele de inițiere. Cheia comună nu este trimisă
în request-ul de plată.

## Configurarea serviciului API

- `NETOPIA_IPN_PUBLIC_KEY`: cheia PEM confirmată de NETOPIA, comună LIVE/SANDBOX.
  Valoarea completă este în `.env.example`, într-o singură linie cu `\n`.
  Copiaz-o în variabilele serviciului API și repornește/redeployează API-ul.
  Sunt acceptate atât newline-uri reale, cât și secvențe literale `\n`.
  Cheia lipsește sau este invalidă → HTTP 503; nu există fallback la cheia veche.
- `MEMBERSHIP_API_ORIGIN`: originea HTTPS publică a API-ului. Alternativ,
  `PUBLIC_API_BASE_URL`, apoi `WEB_ORIGIN` sunt fallback-urile existente.
- `MEMBERSHIP_WEB_ORIGIN`: originea HTTPS a aplicației; fallback `WEB_ORIGIN`.
- `PAYMENT_CONFIG_KMS_KEY_ID` și `AWS_REGION`: configurația existentă pentru
  decriptarea reviziilor. Păstrează accesul IAM/KMS existent.

Nu sunt necesare variabile `NETOPIA_API_KEY` sau `NETOPIA_POS_SIGNATURE` în
această implementare: valorile sunt administrate în interfață și stocate
criptat, separat pentru SANDBOX și LIVE. Nu înlocui credentialele existente.

## Tokenul și răspunsul

Endpoint: `POST /api/membership/netopia/notify` pe originea API configurată.
Tokenul este citit din headerul `verification-token` (numele headerelor HTTP
nu țin cont de litere mari/mici). Un prefix opțional `Bearer ` este eliminat.
Nu se citește tokenul din `Authorization`, query sau corp și nu se cere login.

Implementarea folosește `node:crypto`, păstrând lista explicită de algoritmi
RSA existentă: RS256, RS384, RS512. Testele includ semnături reale RS512.
Nu există un token real capturat pentru a justifica restrângerea la un singur
algoritm. Algoritmul primit apare în loguri; `none`, HMAC, tokenurile malformate
și extensiile JWT critice nesuportate sunt respinse.

Se verifică semnătura, `iss = NETOPIA Payments`, `aud` egal cu semnătura POS
din revizia plății, `sub` egal cu hash-ul SHA-512/base64 al octeților originali,
`exp` și `nbf` dacă există, plus validările existente pentru `iat`. Corpul
brut trebuie păstrat: nu reserializa JSON-ul înainte de verificare.

Order ID este folosit inițial doar pentru găsirea reviziei și a POS-ului;
nu se modifică date înainte de validare. Se compară apoi tranzacția locală,
suma în bani, moneda RON și identificatorul NETOPIA, și se validează statusul.
Statusurile 3/5 confirmă plata; statusurile de refund/chargeback rămân în
fluxul existent de verificare manuală, inclusiv refund parțial. Duplicatele
sunt protejate prin tranzacție, lock-ul PostgreSQL existent, hash de eveniment
și verificarea încasării deja create.

Notificările valide și duplicatele procesate întorc HTTP **200**, cu
`{"errorCode":0}`. JWT invalid → 401; token lipsă/corp invalid/nepotrivire
de tranzacție → 400. Nu se confirmă artificial o notificare respinsă.
Erorile de infrastructură trebuie remediate, nu mascate cu HTTP 200.

SDK-ul oficial [NETOPIA Go, ipn.go](https://github.com/netopiapayments/go-sdk/blob/main/ipn.go)
confirmă headerul Verification-token, issuer, audience și hash-ul SHA-512 al
corpului. [Exemplul oficial](https://github.com/netopiapayments/go-sdk#ipn-verification)
folosește HTTP 400 la eroare și 200 la succes. Am păstrat HTTP 401 existent
pentru JWT invalid; confirmă cu NETOPIA politica de retry și răspunsul cerut
pentru notificări invalide dacă este nevoie să schimbi acest contract.

## Test SANDBOX end-to-end

1. Configurează cheia IPN pe API, apoi redeployează/repornește serviciul.
2. Selectează NETOPIA → Sandbox în pagina procesatorului. Verifică API key și
   POS signature SANDBOX deja salvate; nu folosi credentialele LIVE.
3. Înregistrează în NETOPIA URL-ul HTTPS public complet de notify. Verifică
   faptul că proxy-ul păstrează headerul `verification-token`, corpul JSON
   și ruta fără redirect sau login.
4. Pornește o plată nouă din aplicație și finalizeaz-o cu cardul de test
   furnizat de NETOPIA. Nu marca plata plătită pe baza redirectului din browser.
5. În logurile API verifică `netopia.ipn.jwt`: orderId, algorithm, jwtValid;
   apoi `netopia.ipn.processing`: același orderId, status și result=processed.
   Verifică HTTP 200 în istoricul de notificări NETOPIA și o singură încasare
   și alocare locală.
6. Cere retrimiterea aceleiași notificări: HTTP 200 și result=duplicate,
   fără încasare/alocare suplimentară. Testează și o plată respinsă.

Logurile includ timestamp UTC, orderId valid ca format, rezultatul validării,
algoritmul, statusul și faza erorii. Valorile dintr-un request respins sunt
doar diagnostic, fără autoritate asupra plății. Nu se loghează JWT complet,
API key, POS signature, corpul brut sau date de card.

Nu trebuie cerută o altă cheie NETOPIA înainte de retestare. Dacă problema
persistă, cere headerul JWT (algoritmul), numele headerului transmis, claims
relevante fără token complet, timestamp-ul și statusul HTTP observat. Nu
expune tokenuri sau credentiale în loguri ori tichete.

## Teste locale

Din `apps/api`, cu dependențele instalate:

```text
node node_modules/jest/bin/jest.js netopia.service.spec.ts membership.service.spec.ts payment-configuration.service.spec.ts --runInBand
node node_modules/typescript/bin/tsc --noEmit
```

Testele HTTP folosesc Nest/Express, corp brut și semnături RSA reale. Stocarea
este simulată de fixture-ul existent; verificările PostgreSQL de concurență
aparțin runnerului de integrare existent. Un test local nu confirmă accesul
extern NETOPIA, configurația proxy-ului sau credentialele din hosting.

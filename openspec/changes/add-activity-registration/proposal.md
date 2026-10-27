# Înscrieri la activități și acorduri individuale

## Why

Publicarea acordurilor pe ramuri nu leagă răspunsurile părintelui, participarea și încasările. Activitățile au nevoie de înscriere publică prin ID Orgo sau cont, cu plăți distincte de cotizații.

## What changes

- Pagină publică cu detalii, înscriere și plata unei înscrieri existente.
- Formular fără precompletare pentru vizitatori; precompletare autentificată cu permisiunile fișei membrului pentru informații private/medicale.
- Configurare eligibilitate, aprobare, capacități separate beneficiari/adulți și total, așteptare, tarife, familie, tranșe și întrebări.
- Registru cu participare, sold și acord urmărite separat; transfer, cash, susținere CL și restituiri auditate.
- PDF individual din publicația imuabilă, semnare fizică sau încărcarea PDF-ului semnat; resemnare explicită și istoric.
- Adulții din echipă doar confirmă venirea, cu certificatul validat pentru începutul activității. Beneficiarii majori păstrează înscrierea și plata, fără acord parental.
- Reutilizarea configurațiilor și adaptoarelor NETOPIA/Stripe; notificările verificate nu creditează cotizația.
- Confirmare și acces prin link personal, cu livrare e-mail durabilă configurabilă.

## Authorization

Deciziile au fost stabilite în interviul din 27 octombrie 2026. Utilizatorul a cerut explicit începerea implementării pe baza lor. Nu sunt autorizate deploy, activarea unor credențiale noi sau trimiterea unor mesaje de test către persoane reale.

## Assumptions

- Tipul Fam 1/2/3 propune o reducere, fără a demonstra relația dintre două persoane. Coordonatorul confirmă grupul familial participant la aceeași activitate.
- Restanțele și promovarea de pe așteptare se rezolvă manual. Retragerea nu produce automat restituiri sau modificarea altor taxe.
- Comisionul vine din configurația existentă, este estimativ, iar sugestia se rotunjește în sus la 5 lei. Prețul confirmat este comun tuturor metodelor.
- Certificatul existent este validat pe an cercetășesc; se folosește anul corespunzător începerii activității.
- Plata nu reprezintă acord semnat. Un PDF încărcat necesită verificare de către o persoană autorizată; nu pretindem verificarea criptografică a semnăturii.

## Impact

Modul nou în NestJS/PostgreSQL, pagini SvelteKit, extindere renderer și migrare aditivă. Nu se transformă înscrierile în obligații de cotizație și nu se inventează endpoint-uri Orgo de înscriere.

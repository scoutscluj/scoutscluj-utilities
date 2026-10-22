# Organizarea membrilor și administrarea în context

## Why

Modelul actual amestecă ramura de vârstă, unitatea configurabilă și responsabilitățile adulților. Membrii importați pot avea categoria în Orgo fără să apară în filtrul unității. Separarea administrării într-un submeniu dublează interfața, iar permisiunile pe responsabilități nu garantează izolarea Cluj–Florești.

## What Changes

- Fiecare structură, Cluj și Florești, are aceleași șapte unități fixe: Lupișori, Temerari, Exploratori, Seniori, Lideri, Voluntari adulți și Scouteri. Fiecare membru are o singură categorie principală; responsabilitățile sunt separate și pot fi multiple.
- Numai subunitățile sunt configurabile. Unitățile fixe nu pot fi create, redenumite, arhivate sau șterse de utilizatori.
- Afilierea inițială folosește numele Orgo: numele normalizat care conține „Florești” propune Florești; restul propun Cluj. Previzualizarea permite corectarea excepțiilor înainte de confirmare. Afilierea confirmată este stocată și nu se schimbă la redenumire sau sincronizare.
- Adulții autentificați au acces la registrul de bază al propriei structuri. Numai administratorii centrali/Consiliul din Cluj pot vedea ambele structuri. Restricția se aplică în backend, inclusiv numărătorilor, căutărilor și exporturilor.
- Gestionarea se face direct în paginile de membri și unități, prin butoane și meniuri contextuale disponibile conform permisiunilor. Formularele se deschid în dialoguri. Submeniurile de administrare a membrilor/unităților dispar.
- Categoria principală poate fi filtrată chiar dacă membrul nu are subunitate. Datele lipsă sau contradictorii apar „De verificat”, fără a crea o a opta unitate.
- Delegarea urmează ierarhia agreată, fără escaladarea drepturilor.

## Impact

API și model de date pentru membri, unități, subunități, responsabilități și autorizare; sincronizare Orgo; migrare cu previzualizare și audit; paginile și navigarea membrilor. Se păstrează identitățile membrilor, documentele, istoricul și legăturile financiare.

Această propunere înlocuiește regulile incompatibile din `add-unit-member-management` și `add-local-structures-and-bank-admissions` privind unitățile modificabile, categoriile adulților, accesul între structuri și clasificarea inițială. Nu activează progresia anuală și nu modifică tarife sau înregistrări financiare istorice.

## Approval

Deciziile de domeniu de mai sus au fost agreate în interviu. Propunerea a fost aprobată explicit de utilizator prin „implementeaza si trimite in productie” la 22 octombrie 2026.

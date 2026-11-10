# Tutorial video pentru părinți

Pagina publică: https://resurse.scoutscluj.ro/tutorial-inscriere

- Durată: 2:42 (162 secunde), 1600 × 900, H.264/AAC, MP4 cu faststart.
- Fără voce. Explicații românești în dreapta, interfață reală în stânga.
- Muzică instrumentală Higgsfield / ElevenLabs Music v2.5; `force_instrumental=true`, o singură variantă, job `4aa892f4-d732-44c5-8e65-f7023e54e943`.
- Date fictive, domeniul example.com; înscrierea este trimisă numai în fixture-ul local. Ecranul OAuth este citit în producție, fără trimiterea emailului sau solicitarea unui cod.
- Capturi realizate pe 10 noiembrie 2026, după publicarea fluxului de înscriere. Niciun membru real nu apare în înregistrare.

## Surse și refacere

`apps/web/src/lib/members/registration-tutorial.json` este sursa comună pentru
textele laterale, duratele scenelor, capitole și transcrierea de pe pagină.

1. Construiește versiunea web curentă (`pnpm --filter web build`).
2. Pornește fixture-ul izolat: `node scripts/tutorial-inscriere/preview.cjs`.
3. Capturează interfața: `node scripts/tutorial-inscriere/capture.cjs`.
4. Salvează muzica instrumentală autorizată în `tmp/tutorial-inscriere/music.mp3`.
5. Configurează `TUTORIAL_FFMPEG` către un executabil FFmpeg cu libx264 și rulează `node scripts/tutorial-inscriere/compose.cjs`.
6. Verifică imaginile `tmp/tutorial-inscriere/frame-*.png`, metadatele și redarea MP4, nivelul audio și subtitrările. Verifică pagina la desktop și pe mobil.

Rezultatele sunt în `apps/web/static/tutoriale/`: MP4, poster WebP, explicații VTT
și capitole VTT. Pagina nu are nevoie de autentificare. Mesajul comun din
`registration-guide.ts` include URL-ul absolut al tutorialului, iar formularul
îl afișează atât înainte, cât și după trimitere.

Fișierul MP4 conține numai muzica, fără narator. Nivelul audio este normalizat
pentru fundal discret, cu intrare/ieșire graduală. Textele video și pagina
păstrează distincția dintre emailul contului copilului și contactele părintelui.

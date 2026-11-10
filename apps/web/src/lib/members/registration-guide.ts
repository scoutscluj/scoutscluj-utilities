export function registrationGuide(origin: string) {
	const registration = new URL('/register', origin).href;
	const login = new URL('/login', origin).href;
	return `Înscriere în Scouts Cluj

1. Deschide ${registration} și alege dacă te înscrii pe tine sau pe copilul tău / altă persoană.
2. Pregătește numele, data nașterii, genul, situația școlară și clasa, structura (Cluj sau Florești) și ramura de vârstă. Fotografia de profil este opțională. Pentru minori sunt necesare și datele părintelui / tutorelui; pentru alt adult, contactul persoanei care completează.
3. Folosește de preferat emailul persoanei înscrise. Pentru un copil fără email propriu poți folosi o adresă a părintelui, dacă nu este utilizată pentru alt cont Orgo sau alt membru. Fiecare cont are nevoie de o adresă unică, la care ai acces: aceea va fi adresa de autentificare. Contactul părintelui (nume, email, telefon) se completează separat și rămâne privat în Resurse. Pentru frați, folosește același email de contact al părintelui: centrul verifică familia și încadrarea cotizației. Asocierea nu acordă acces automat la contul copilului.
4. Trimite cererea și așteaptă verificarea de către un administrator sau un lider autorizat. Trimiterea formularului nu oferă acces imediat; nu trebuie să îl completezi din nou.
5. După aprobare pregătim contul în Orgo, cunoscută și ca membri.scout.ro: platforma națională care centralizează cercetașii din România. Contul național este folosit și pentru autentificarea în aplicația Resurse Scouts Cluj.
6. Când primești emailul despre crearea contului, deschide ${login}, apasă „Connect with Orgo” și autentifică-te prin codul primit la adresa folosită în formular. Poți folosi și Google dacă acel cont Google are aceeași adresă de email. Nu este nevoie să configurezi profilul în membri.scout.ro sau să setezi o parolă înainte de a intra în Resurse.

Dacă emailul nu ajunge după confirmarea înscrierii, verifică Spam și contactează liderul sau centrul local: cluj.napoca@scout.ro.`;
}

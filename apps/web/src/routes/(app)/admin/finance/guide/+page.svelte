<script lang="ts">
	import MembershipAdminPage from '$lib/membership/MembershipAdminPage.svelte';
	import { resolve } from '$app/paths';
	const chapters = [
		['orientare', 'Unde găsești fiecare operație'],
		['cotizatii', 'Perioade, membri și sume'],
		['plati', 'Plata cu cardul și transferul bancar'],
		['procesatori', 'Procesatori și decontări'],
		['transferuri', 'Transferuri naționale și ORGO'],
		['corectii', 'Verificări, corecții și rambursări'],
		['rutina', 'Lista de verificare a responsabilului financiar']
	];
</script>

<MembershipAdminPage
	title="Ghid financiar"
	description="Instrucțiuni pentru administratori și responsabili financiari. Urmează operația pe care vrei să o faci, fără cunoștințe tehnice."
>
	<nav aria-label="Cuprinsul ghidului">
		{#each chapters as [id, label] (id)}<a href={'#' + id}>{label}</a>{/each}
	</nav>
	<section id="orientare">
		<h2>Unde găsești fiecare operație</h2>
		<p>
			Meniul Admin → Financiar este disponibil administratorilor, superadministratorilor și
			responsabililor financiari. Membrii obișnuiți își consultă și plătesc cotizația în pagina
			Cotizație.
		</p>
		<ul>
			<li>
				<a href={resolve('/admin/finance/membership')}>Membri și cotizații</a>: caută un membru,
				vezi cât are de plătit și ce sume sunt încasate. Deschide detaliile membrului pentru
				istoricul său.
			</li>
			<li>
				<a href={resolve('/admin/finance/receipts')}>Încasări</a>: înregistrează banii primiți prin
				bancă și repartizează-i membrilor; urmărește și încasările confirmate prin card.
			</li>
			<li>
				<a href={resolve('/admin/finance/transfers')}>Transferuri naționale</a>: înregistrează
				partea trimisă organizației naționale și urmărește marcarea cotizației în ORGO.
			</li>
			<li>
				<a href={resolve('/admin/finance/payment-processor')}>Procesatori de plăți</a>: configurează
				NETOPIA sau Stripe, mediul de lucru și comisioanele.
			</li>
			<li>
				<a href={resolve('/admin/finance/membership-settings')}>Configurare cotizații</a>:
				pregătește perioadele și tarifele; inițializează și sincronizează membrii.
			</li>
			<li>
				<a href={resolve('/admin/finance/receipts#decontari')}>Decontări procesator</a>: compară
				raportul procesatorului cu suma virată în bancă.
			</li>
		</ul>
		<p>
			O <strong>cotizație</strong> arată ce datorează membrul. O <strong>încasare</strong> arată ce
			bani au ajuns la asociație. O <strong>alocare</strong> leagă acei bani de cotizația unui
			membru. O <strong>decontare</strong> arată viramentul procesatorului către bancă. Un
			<strong>transfer național</strong> arată partea trimisă mai departe. Sunt etape diferite și fiecare
			are propria confirmare.
		</p>
	</section>
	<section id="cotizatii">
		<h2>Perioade, membri și sume</h2>
		<p>
			Anul de cotizație începe la 1 septembrie și se termină la 31 august. Aplicația pregătește
			automat noua perioadă, folosind tarifele de bază din perioada precedentă. Verifică perioada
			activă și sumele înainte de inițializare.
		</p>
		<ol>
			<li>
				În Configurare cotizații, cere previzualizarea inițializării. Verifică membrii, planurile și
				cazurile semnalate.
			</li>
			<li>
				Confirmă inițializarea: aceasta creează cotizațiile membrilor eligibili pentru perioada
				activă.
			</li>
			<li>
				Folosește Sincronizează acum cu ORGO după modificări importante. Sincronizarea automată
				verifică periodic registrul, aproximativ la 15 minute.
			</li>
		</ol>
		<p>
			Planul de cotizație este preluat din ORGO. Un membru nou poate fi adăugat ulterior fără a
			recrea cotizațiile existente. Dacă se schimbă planul unui membru care are deja încasări,
			situația este semnalată pentru verificare; istoricul financiar se păstrează. Inițializarea nu
			confirmă plăți în ORGO.
		</p>
		<h3>Cum se calculează totalul publicat</h3>
		<p>
			Introduci tariful de bază în lei. Aplicația găsește suma care acoperă acest tarif după
			reținerea comisionului procentual și a comisionului fix, apoi o rotunjește în sus la primul
			multiplu de 5 lei. Se folosește comisionul procesatorului activ. <strong
				>Același total se plătește cu cardul și prin transfer bancar.</strong
			> Partea națională stabilită în plan nu este mărită de această ajustare.
		</p>
		<p>
			Exemplu pentru un tarif de bază de 300 lei: la 1,19% + 0,30 lei, totalul publicat este 305
			lei; la 1,5% + 1 leu, este 310 lei. Acestea sunt exemple de tarife publice standard.
			Contractul, tipul cardului sau taxele aplicabile pot schimba costul real; verifică și
			configurează comisionul efectiv.
		</p>
		<p>
			Schimbarea procesatorului sau a comisionului recalculează tarifele perioadei active și
			cotizațiile fără istoric de plată. Cotizațiile cu alocări, transferuri naționale, cazuri de
			verificat sau plăți cu cardul în curs își păstrează suma. O plată parțială lasă de achitat
			diferența din totalul deja stabilit. Nu se adaugă încă un comision peste această diferență.
		</p>
	</section>
	<section id="plati">
		<h2>Plata cu cardul și transferul bancar</h2>
		<h3>Card</h3>
		<p>
			Membrul autentificat își vede cotizația și suma rămasă. Poate plăti și pentru alt membru,
			folosind ID-ul ORGO sau ID-ul cardului. Aplicația verifică apartenența la centrul local și
			afișează suma înainte de trimiterea la procesator. Nu se alege arbitrar un plan pentru alt
			membru.
		</p>
		<p>
			Revenirea pe site după plată nu este suficientă pentru confirmare. Aplicația așteaptă
			confirmarea procesatorului, creează încasarea și o alocă membrului. Dacă rezultatul este în
			așteptare sau necunoscut, verifică tranzacția înainte de a solicita o nouă plată. Mesajele
			repetate ale procesatorului nu creează încasări duble.
		</p>
		<h3>Bancă</h3>
		<ol>
			<li>Verifică în extras că banii au fost primiți efectiv.</li>
			<li>
				În Încasări, înregistrează o singură dată suma integrală a transferului, data, referința
				bancară și o explicație.
			</li>
			<li>
				Alocă suma cotizației membrului. Dacă transferul acoperă mai mulți membri, împarte aceeași
				încasare între ei.
			</li>
			<li>Verifică restul nealocat și soldul fiecărui membru.</li>
		</ol>
		<p>
			De exemplu, un transfer de 610 lei pentru două cotizații de 305 lei se înregistrează ca o
			încasare de 610 lei și două alocări de câte 305 lei. Nu crea două încasări de 610 lei. O
			alocare nu poate depăși banii disponibili sau cotizația rămasă. Plățile parțiale sunt permise;
			partea națională poate fi transferată numai după încasarea integrală.
		</p>
	</section>
	<section id="procesatori">
		<h2>Procesatori și decontări</h2>
		<p>
			NETOPIA și Stripe au configurații separate. Selectează procesatorul și mediul dorit:
			test/sandbox pentru verificări, live pentru încasări reale. Activarea unui mediu necesită o
			configurație validă. Cheile salvate sunt protejate și nu sunt afișate integral în aplicație.
		</p>
		<p>
			Completează comisionul procentual și suma fixă pentru fiecare procesator conform contractului,
			incluzând taxele care se aplică efectiv. Tariful standard Stripe pentru carduri SEE obișnuite
			diferă de cel pentru carduri premium sau internaționale. Aplicația folosește comisionul
			configurat pentru publicarea prețului; comisionul efectiv din raportul procesatorului se
			verifică la decontare.
		</p>
		<p>
			O plată deja începută rămâne legată de procesatorul, mediul și suma inițiale, chiar dacă
			schimbi ulterior configurația. Pentru o schimbare în live, verifică mai întâi configurația și
			tarifele, apoi selectează procesatorul activ. Nu testa cu tranzacții reale pentru a simula o
			încasare.
		</p>
		<p>
			În Decontări procesator, selectează încasările din raport și introdu brutul, rambursările,
			comisioanele și netul virat. Verifică egalitatea: <strong
				>brut − rambursări − comisioane = net</strong
			>. Compară netul cu extrasul bancar. Viramentul procesatorului nu se înregistrează din nou ca
			o încasare de cotizație: acei bani sunt deja în registru.
		</p>
	</section>
	<section id="transferuri">
		<h2>Transferuri naționale și ORGO</h2>
		<ol>
			<li>
				În Transferuri naționale, selectează membrii cu cotizația încasată integral și fără cazuri
				de verificat. Verifică suma națională totală.
			</li>
			<li>Efectuează transferul din contul bancar al asociației către organizația națională.</li>
			<li>
				Înregistrează aici transferul efectuat, data, referința și explicația. O parte națională nu
				poate fi introdusă de două ori.
			</li>
			<li>Urmărește separat starea ORGO a fiecărui membru din transfer.</li>
		</ol>
		<p>
			După înregistrare, aplicația verifică membrul, centrul local, perioada și suma națională în
			ORGO. Dacă se potrivesc, folosește operația ORGO de marcare a cotizației naționale ca plătită.
			Apoi recitește istoricul perioadei: starea <strong>Confirmat în ORGO</strong> apare numai după această
			verificare. Dacă perioada este deja plătită, nu trimite încă o plată.
		</p>
		<p>
			Operația este procesată în fundal, de regulă la următoarea verificare din minutul următor.
			Folosește tokenul ORGO al utilizatorului care înregistrează transferul, cu drepturi financiare
			naționale. Dacă tokenul expiră, autentifică-te din nou și reia sincronizarea. În lipsa
			accesului, transferul bancar înregistrat în Resurse se păstrează, iar problema este afișată.
		</p>
		<ul>
			<li><strong>În așteptare / Se sincronizează</strong>: aplicația lucrează; nu retrimite.</li>
			<li>
				<strong>Așteaptă aprobare ORGO</strong>: înregistrarea există, dar este în așteptare în
				ORGO. Un responsabil autorizat trebuie să o aprobe acolo. Aplicația verifică din nou
				rezultatul.
			</li>
			<li>
				<strong>Acces ORGO necesar / Sincronizare nereușită</strong>: citește explicația, corectează
				accesul sau datele și folosește Reîncearcă sincronizarea.
			</li>
			<li>
				<strong>Rezultat ORGO incert</strong>: cererea ar putea fi deja înregistrată. Folosește
				Verifică rezultatul în ORGO; acest pas doar citește istoricul. Pentru o nouă trimitere,
				verifică întâi în ORGO absența înregistrării și completează dovada verificării cerută de
				formular.
			</li>
			<li>
				<strong>Corecție necesară</strong>: situația financiară a fost modificată după transfer.
				Rezolvă cazul în Resurse și cu organizația națională.
			</li>
		</ul>
		<p>
			Transferurile mai vechi, aflate deja în așteptarea accesului, nu sunt retrimise automat la
			instalarea acestei funcții. Verifică-le individual și reîncearcă explicit. Confirmarea manuală
			cu dovadă este disponibilă pentru un rezultat verificat în ORGO; ea documentează rezultatul și
			nu execută o plată în ORGO.
		</p>
	</section>
	<section id="corectii">
		<h2>Verificări, corecții și rambursări</h2>
		<p>
			Rezolvă întâi situațiile marcate pentru verificare. Caută dovada bancară sau tranzacția la
			procesator și compară membrul, perioada, suma și moneda. Pentru o plată cu rezultat
			necunoscut, închiderea manuală cere dovadă că tranzacția nu a fost încasată. Nu presupune că o
			eroare de conexiune înseamnă lipsa plății.
		</p>
		<p>
			Pentru o alocare greșită, anulează alocarea cu o explicație, apoi alocă banii corect.
			Încasarea rămâne în istoric. Pentru o rambursare, efectuează restituirea prin procesator sau
			bancă, anulează alocările afectate și înregistrează suma rambursată cu dovadă. Formularul din
			Resurse actualizează evidența; nu trimite el însuși bani înapoi.
		</p>
		<p>
			Dacă partea națională a fost deja transferată, anularea alocării semnalează o corecție.
			Transferul bancar și confirmarea ORGO nu se șterg automat. Contactează responsabilul național
			pentru regularizare și documentează soluția. Istoricul operațiilor păstrează autorul și
			explicațiile modificărilor.
		</p>
	</section>
	<section id="rutina">
		<h2>Lista de verificare a responsabilului financiar</h2>
		<ul>
			<li>
				Verifică perioada activă, procesatorul live și totalurile publicate înainte de a anunța
				plățile.
			</li>
			<li>Compară extrasul bancar cu încasările și repartizează sumele nealocate.</li>
			<li>Verifică plățile în curs, rezultatele necunoscute și membrii semnalați.</li>
			<li>Compară rapoartele procesatorului cu decontările și viramentele bancare.</li>
			<li>
				Transferă numai părțile naționale eligibile și verifică rezultatul ORGO pentru fiecare
				membru.
			</li>
			<li>
				Păstrează referințele și documentele justificative. Modulele pentru documente financiare,
				activități și contabilitate au propriile evidențe; introducerea unui document acolo nu
				creează automat o alocare de cotizație.
			</li>
		</ul>
	</section>
</MembershipAdminPage>

<style>
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	nav a {
		padding: 10px 14px;
		border-radius: 8px;
		background: #eef2f7;
	}
	a {
		color: #285a84;
		text-underline-offset: 3px;
	}
	section {
		scroll-margin-top: 24px;
	}
	li {
		margin: 10px 0;
		line-height: 1.7;
	}
</style>

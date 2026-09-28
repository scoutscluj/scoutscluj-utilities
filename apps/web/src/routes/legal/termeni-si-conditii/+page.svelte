<script lang="ts">
	import LegalPage from '$lib/legal/LegalPage.svelte';
	import { organization } from '$lib/legal/organization';
</script>

<LegalPage title="Termeni și condiții">
	<h2>1. Cine operează platforma</h2>
	<p>
		Platforma Resurse Scouts Cluj este operată de {organization.legalName}, persoană juridică română
		fără scop patrimonial, CIF {organization.taxId}, înscrisă în Registrul asociațiilor și
		fundațiilor sub nr. {organization.registryNumber}. Asociația încasează cotizații statutare de la
		membrii săi. Nu acționăm ca marketplace, intermediar sau distribuitor pentru un alt comerciant.
	</p>

	<h2>2. Serviciul oferit</h2>
	<p>
		Pagina de cotizație permite achitarea obligației anuale de membru către centrul local. Nu se
		livrează bunuri fizice. Plata nu înlocuiește regulile de dobândire sau păstrare a calității de
		membru și nu garantează înscrierea la o anumită activitate.
	</p>
	<p>
		Pentru o plată fără autentificare, plătitorul introduce ID-ul ORGO sau ID Card al beneficiarului
		și alege planul. Centrul verifică manual beneficiarul și planul înainte de a credita cotizația.
	</p>

	<h2>3. Prețuri, monedă și planuri</h2>
	<p>
		Prețul aplicabil, planul și moneda sunt afișate înainte de inițierea plății. Toate plățile se
		efectuează în lei (RON). Planurile de familie și planul social pot avea valori reduse conform
		deciziei publicate pentru perioada de cotizație. Totalul afișat înainte de plată este suma
		încasată; nu adăugăm automat un comision separat pentru plata cu cardul.
	</p>

	<h2>4. Metode de plată</h2>
	<ul>
		<li>card Visa sau Mastercard, prin pagina securizată NETOPIA Payments sau Stripe;</li>
		<li>transfer bancar, în condițiile comunicate de centrul local.</li>
	</ul>
	<p>
		Datele complete ale cardului sunt introduse pe pagina procesatorului selectat și nu sunt primite
		sau stocate de Resurse Scouts Cluj. O plată este considerată confirmată numai după notificarea
		validată de la procesator.
	</p>

	<h2>5. Obligațiile plătitorului</h2>
	<p>
		Plătitorul trebuie să furnizeze date corecte, să verifice beneficiarul, planul și totalul și să
		folosească un instrument de plată pe care este autorizat să îl utilizeze. O plată aflată în curs
		nu trebuie repetată înainte de verificarea stării ei.
	</p>

	<h2>6. Confirmare, anulare și rambursare</h2>
	<p>
		Confirmarea și alocarea plății sunt descrise în politica de confirmare. Cererile de anulare,
		corectare sau rambursare sunt soluționate conform politicii de anulare și retragere.
		Procesatorul selectat operează plata; decizia privind rambursarea aparține asociației.
	</p>

	<h2>7. Disponibilitatea platformei</h2>
	<p>
		Putem întrerupe temporar platforma pentru mentenanță, securitate sau indisponibilitatea unui
		furnizor. Evidența financiară confirmată rămâne disponibilă responsabililor autorizați ai
		asociației.
	</p>

	<h2>8. Reclamații și litigii</h2>
	<p>
		Pentru clarificări sau reclamații, contactează-ne mai întâi la
		<a href={`mailto:${organization.email}`}>{organization.email}</a>. Consumatorii pot apela la
		<a href="https://anpc.ro/sal/" rel="external"
			>Direcția de Soluționare Alternativă a Litigiilor din cadrul ANPC</a
		>. Se aplică legea română.
	</p>
</LegalPage>

<script lang="ts">
	import LegalPage from '$lib/legal/LegalPage.svelte';
	import { organization } from '$lib/legal/organization';
</script>

<LegalPage title="Politica de confidențialitate și GDPR">
	<h2>Operatorul datelor</h2>
	<p>
		{organization.legalName} este operatorul datelor prelucrate prin Resurse Scouts Cluj. Întrebările
		și cererile privind datele personale pot fi trimise la
		<a href={`mailto:${organization.email}`}>{organization.email}</a>.
	</p>
	<h2>Date prelucrate</h2>
	<ul>
		<li>datele contului și identificatorii ORGO necesari autentificării și asocierii membrului;</li>
		<li>ID-ul ORGO sau ID Card introdus pentru beneficiarul unei plăți;</li>
		<li>numele, emailul, telefonul și datele de facturare furnizate la checkout;</li>
		<li>suma, planul, starea, referințele și istoricul operațiunilor financiare;</li>
		<li>
			date tehnice și de securitate necesare prevenirii abuzurilor și investigării incidentelor.
		</li>
	</ul>
	<p>
		Resurse Scouts Cluj nu primește și nu stochează numărul complet al cardului, data expirării sau
		codul de securitate. Acestea sunt prelucrate pe pagina securizată a procesatorului de plată.
	</p>
	<h2>Scopuri și temeiuri</h2>
	<p>
		Prelucrăm datele pentru administrarea relației de membru, încasarea și alocarea cotizației,
		îndeplinirea obligațiilor contabile și legale, soluționarea cererilor, securitatea platformei și
		apărarea drepturilor asociației sau ale persoanelor vizate. Temeiul poate fi executarea relației
		statutare sau contractuale, obligația legală și interesul legitim, după caz.
	</p>
	<h2>Destinatari</h2>
	<p>
		Datele sunt accesibile numai persoanelor autorizate din asociație și furnizorilor necesari
		operării serviciului, inclusiv ORGO pentru autentificare, NETOPIA Payments, Stripe și
		instituțiile financiare implicate în plată, furnizorii de găzduire și contabilitate, precum și
		autoritățile atunci când legea o cere. Furnizorii primesc numai datele necesare rolului lor.
	</p>
	<h2>Păstrare și securitate</h2>
	<p>
		Păstrăm datele cât timp sunt necesare scopurilor declarate și apoi pe duratele impuse de normele
		contabile, fiscale, asociative și de apărare a drepturilor. Folosim control de acces, jurnal de
		audit, conexiuni HTTPS în producție și criptarea tokenului ORGO stocat.
	</p>
	<h2>Drepturile persoanei vizate</h2>
	<p>
		În condițiile Regulamentului (UE) 2016/679, poți solicita accesul, rectificarea, ștergerea,
		restricționarea, portabilitatea sau opoziția și poți depune plângere la Autoritatea Națională de
		Supraveghere a Prelucrării Datelor cu Caracter Personal. Unele date financiare nu pot fi șterse
		înainte de expirarea obligației legale de păstrare.
	</p>
	<h2>Cookie-uri</h2>
	<p>
		Folosim cookie-uri strict necesare pentru sesiunea autentificată, securitate și urmărirea stării
		propriei încercări de plată. Nu folosim aceste cookie-uri pentru publicitate comportamentală.
	</p>
</LegalPage>

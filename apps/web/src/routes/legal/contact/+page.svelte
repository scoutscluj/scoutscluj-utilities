<script lang="ts">
	import LegalPage from '$lib/legal/LegalPage.svelte';
	import { organization } from '$lib/legal/organization';
</script>

<LegalPage title="Contact și identificare">
	<h2>Entitatea care încasează cotizația</h2>
	<dl>
		<div>
			<dt>Denumire</dt>
			<dd>{organization.legalName}</dd>
		</div>
		<div>
			<dt>CIF</dt>
			<dd>{organization.taxId}</dd>
		</div>
		<div>
			<dt>Registru</dt>
			<dd>Registrul asociațiilor și fundațiilor, nr. {organization.registryNumber}</dd>
		</div>
		<div>
			<dt>Sediu</dt>
			<dd>{organization.address}</dd>
		</div>
		<div>
			<dt>Email</dt>
			<dd><a href={`mailto:${organization.email}`}>{organization.email}</a></dd>
		</div>
		<div>
			<dt>Telefon</dt>
			<dd><a href={`tel:${organization.phoneHref}`}>{organization.phoneDisplay}</a></dd>
		</div>
	</dl>
	<h2>Asistență pentru plăți</h2>
	<p>
		Pentru identificarea rapidă a plății, comunică data, suma, numele plătitorului și ID-ul
		beneficiarului. Nu trimite prin email numărul complet al cardului sau codul de securitate.
	</p>
	<h2>Soluționarea alternativă a litigiilor</h2>
	<p>
		Poți consulta procedura oficială
		<a href="https://anpc.ro/sal/" rel="external"
			>SAL din cadrul Autorității Naționale pentru Protecția Consumatorilor</a
		>.
	</p>
</LegalPage>

<style>
	dl,
	dl div {
		display: grid;
		gap: 8px;
	}
	dl div {
		grid-template-columns: minmax(100px, 150px) 1fr;
		border-bottom: 1px solid #e2e8f0;
		padding: 12px 0;
	}
	dt {
		font-weight: 800;
	}
	dd {
		margin: 0;
	}
</style>

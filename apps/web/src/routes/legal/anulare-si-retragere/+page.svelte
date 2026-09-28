<script lang="ts">
	import LegalPage from '$lib/legal/LegalPage.svelte';
	import { organization } from '$lib/legal/organization';
</script>

<LegalPage title="Politica de anulare, retragere și rambursare">
	<h2>Anularea înainte de plată</h2>
	<p>
		Poți renunța înainte de autorizarea cardului prin închiderea paginii procesatorului. Nu se
		încasează o sumă pentru o plată neautorizată.
	</p>
	<h2>Solicitarea după plată</h2>
	<p>
		Trimite solicitarea la <a href={`mailto:${organization.email}`}>{organization.email}</a>, cu
		numele plătitorului, beneficiarul cotizației, data, suma și referința plății. Nu transmite
		datele complete ale cardului. Vom confirma primirea și vom verifica situația în evidența
		asociației și la procesatorul folosit.
	</p>
	<p>
		Plățile duplicate, sumele achitate din eroare și plățile care nu pot fi atribuite beneficiarului
		pot fi corectate sau rambursate după verificare. Dacă rambursarea este aprobată, este inițiată
		către cardul folosit la plată; termenul în care banii apar în cont depinde și de banca emitentă.
	</p>
	<h2>Dreptul de retragere</h2>
	<p>
		Atunci când legislația privind contractele la distanță este aplicabilă situației concrete, poți
		exercita dreptul de retragere printr-o declarație neechivocă transmisă în termenul legal. Natura
		statutară a cotizației și serviciile deja executate pot influența aplicabilitatea și efectele
		retragerii. Fiecare cerere este analizată individual, iar drepturile prevăzute de lege nu sunt
		limitate prin această politică.
	</p>
	<h2>Activități</h2>
	<p>
		Această versiune a platformei procesează numai cotizații. Politicile de anulare pentru
		activități vor fi publicate separat înainte de activarea plăților pentru evenimente.
	</p>
</LegalPage>

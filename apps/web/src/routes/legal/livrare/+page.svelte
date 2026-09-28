<script lang="ts">
	import LegalPage from '$lib/legal/LegalPage.svelte';
</script>

<LegalPage title="Politica de confirmare a plății">
	<h2>Ce se furnizează</h2>
	<p>
		Plata reprezintă cotizația statutară a unui membru. Nu se livrează produse fizice și nu există
		costuri de transport. După autorizarea cardului, procesatorul redirecționează plătitorul către
		pagina de rezultat, iar aplicația așteaptă confirmarea securizată a procesatorului.
	</p>
	<h2>Plata unui utilizator autentificat</h2>
	<p>
		Dacă obligația este deja asociată contului ORGO autentificat, plata confirmată este alocată
		automat acelei obligații. Starea poate fi verificată în pagina de cotizație.
	</p>
	<h2>Plata fără autentificare</h2>
	<p>
		Plata făcută pe baza unui ID introdus manual intră în verificarea responsabilului financiar.
		Încasarea cardului poate fi confirmată înainte ca suma să fie alocată beneficiarului. Dacă ID-ul
		sau planul nu poate fi verificat, te contactăm folosind datele furnizate la plată.
	</p>
	<h2>Plăți neclare sau duplicate</h2>
	<p>
		Dacă pagina este închisă, conexiunea se întrerupe sau rezultatul rămâne „în verificare”, nu
		repeta plata. Responsabilul financiar verifică tranzacția la procesator și actualizează
		evidența.
	</p>
</LegalPage>

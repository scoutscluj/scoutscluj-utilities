<script lang="ts">
	import { resolve } from '$app/paths';
	import { branchLabels } from '@scouts-cluj/parental-consent-schema';
	let { data } = $props();
</script>

<svelte:head><title>Acord parental | {data.activity.title}</title></svelte:head>
<section>
	<h1>Acord parental</h1>
	<p><strong>Format fix activ · editorul general este suspendat temporar.</strong></p>
	<p>
		Completează textele specifice activității în Setări înscrieri → Acord parental. Nu mai este
		necesar să creezi sau să activezi un draft general.
	</p>
	{#if data.canManage}<a href={resolve(`/activities/${data.activity.id}/registrations`)}
			>Pregătește acordul și înscrierile →</a
		>{/if}
	<p>
		Fiecare participant descarcă PDF-ul completat la finalul înscrierii și poate plăti opțional după
		salvare.
	</p>
	{#if data.publication?.documents.length}<h2>Documente publicate anterior</h2>
		{#each data.publication.documents as document (document.id)}<a
				href={resolve(
					`/activities/${data.activity.id}/parental-consent/documents/${document.id}/file`
				)}>{branchLabels[document.branch]} · {document.filename}</a
			>{/each}{/if}
</section>

<style>
	section {
		max-width: 850px;
		padding: 24px;
		display: grid;
		gap: 18px;
	}
	h1,
	h2,
	p {
		margin: 0;
	}
	p {
		line-height: 1.6;
	}
	a {
		color: var(--sc-accent);
		font-weight: 600;
	}
</style>

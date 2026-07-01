<script lang="ts">
	import ProcurementCoveragePanel from './ProcurementCoveragePanel.svelte';
	import ProcurementEventCard from './ProcurementEventCard.svelte';
	import ProcurementEventForm from './ProcurementEventForm.svelte';

	let { data, form } = $props();
</script>

<section class="procurement-page">
	{#if form?.message}
		<p class="form-message">{form.message}</p>
	{/if}

	<ProcurementCoveragePanel overview={data.overview} />

	<section class="panel">
		<h2>Aprovizionare nouă</h2>
		<ProcurementEventForm />
	</section>

	{#each data.events as event (event.id)}
		<ProcurementEventCard
			activityId={data.activityId}
			documents={data.documents}
			{event}
			ingredients={data.ingredients}
		/>
	{/each}
</section>

<style>
	.procurement-page,
	.panel {
		display: grid;
		gap: 16px;
	}

	.panel {
		border: 1px solid #dbe3ef;
		background: #ffffff;
		border-radius: 8px;
		padding: 18px;
		box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
	}

	h2,
	p {
		margin: 0;
	}

	h2 {
		color: #0f172a;
	}

	.form-message {
		border: 1px solid #bfdbfe;
		background: #eff6ff;
		border-radius: 8px;
		padding: 12px 14px;
		color: #1e3a8a;
	}
</style>

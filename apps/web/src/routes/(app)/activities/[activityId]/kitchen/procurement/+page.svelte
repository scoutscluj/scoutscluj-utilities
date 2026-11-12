<script lang="ts">
	import ProcurementCoveragePanel from './ProcurementCoveragePanel.svelte';
	import ProcurementEventCard from './ProcurementEventCard.svelte';
	import ProcurementEventForm from './ProcurementEventForm.svelte';

	let { data, form } = $props();
</script>

<section class="procurement-page">
	<h1>Aprovizionare</h1>
	{#if form?.message}
		<p class="form-message">{form.message}</p>
	{/if}

	<ProcurementCoveragePanel overview={data.overview} />

	<details class="panel">
		<summary>Aprovizionare nouă</summary>
		<ProcurementEventForm />
	</details>

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
		border: 1px solid var(--sc-border);
		background: var(--sc-surface);
		border-radius: 8px;
		padding: 18px;
		box-shadow: var(--sc-shadow);
	}

	p {
		margin: 0;
	}

	.form-message {
		border: 1px solid var(--sc-border-strong);
		background: var(--sc-info-soft);
		border-radius: 8px;
		padding: 12px 14px;
		color: var(--sc-info);
	}

	h1 {
		margin: 0;
		color: var(--sc-ink);
		font-size: clamp(24px, 3vw, 30px);
		line-height: 1.2;
	}

	summary {
		min-height: 44px;
		align-content: center;
		cursor: pointer;
		font-weight: 600;
		color: var(--sc-ink);
	}
</style>

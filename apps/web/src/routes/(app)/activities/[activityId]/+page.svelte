<script lang="ts">
	import ActivityDepartmentCards from './ActivityDepartmentCards.svelte';
	import ActivityDepartmentForm from './ActivityDepartmentForm.svelte';

	let { data, form } = $props();
</script>

<section class="overview">
	<div class="panel">
		<p class="panel-title">Prezentare</p>
		{#if data.activity.description}
			<p>{data.activity.description}</p>
		{:else}
			<p>Activitatea nu are încă o descriere.</p>
		{/if}
	</div>

	<ActivityDepartmentForm
		activity={data.activity}
		user={data.user}
		message={form?.departmentMessage}
	/>
	<ActivityDepartmentCards activity={data.activity} />
</section>

<style>
	.overview,
	.panel {
		display: grid;
		gap: 16px;
	}

	.panel {
		border: 1px solid #dbe3ef;
		border-radius: 8px;
		background: #ffffff;
		padding: 18px;
		box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
	}

	.panel-title {
		color: #0f172a;
		font-weight: 900;
	}

	p {
		margin: 0;
		color: #64748b;
	}
</style>

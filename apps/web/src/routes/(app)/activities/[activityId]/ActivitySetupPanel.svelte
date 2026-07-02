<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Activity } from './+layout.server';
	import { departmentOptions } from './activity-meta';

	type Props = {
		activity: Activity;
	};

	let { activity }: Props = $props();

	const inactiveDepartments = $derived(
		departmentOptions.filter((department) => !activity.departments.includes(department.id))
	);
</script>

{#if inactiveDepartments.length}
	<section class="setup-panel">
		<div>
			<p>Config</p>
			<span>{inactiveDepartments.map((department) => department.label).join(', ')}</span>
		</div>
		<a href={resolve(`/activities/${activity.id}/settings`)}>Deschide setările</a>
	</section>
{/if}

<style>
	.setup-panel {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
		justify-content: space-between;
		border: 1px dashed #cbd5e1;
		border-radius: 8px;
		background: #f8fafc;
		padding: 12px 14px;
	}

	p,
	span {
		margin: 0;
	}

	p {
		color: #64748b;
		font-size: 0.7rem;
		font-weight: 900;
		text-transform: uppercase;
	}

	span {
		color: #334155;
		font-size: 0.9rem;
	}

	a {
		min-height: 34px;
		display: inline-flex;
		align-items: center;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: #ffffff;
		padding: 0 12px;
		color: #334155;
		font-size: 0.88rem;
		font-weight: 800;
		text-decoration: none;
	}

	a:hover {
		border-color: #991b1b;
		color: #991b1b;
	}
</style>

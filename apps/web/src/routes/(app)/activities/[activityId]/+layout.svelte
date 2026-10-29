<script lang="ts">
	import { setContext } from 'svelte';
	import ActivityPublication from '$lib/activities/ActivityPublication.svelte';
	import { activityEditContext } from '$lib/activities/activity-edit-state';
	const editing = $state({ dirty: false });
	setContext(activityEditContext, editing);
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	let { data, children } = $props();

	const kitchenPath = $derived(resolve(`/activities/${data.activity.id}/kitchen`));
	const isKitchenRoute = $derived(page.url.pathname.startsWith(kitchenPath));
	const kitchenGroups = $derived([
		{
			label: 'Catalog',
			tabs: [
				{
					label: 'Ingrediente',
					href: resolve(`/activities/${data.activity.id}/kitchen/ingredients`)
				},
				{ label: 'Rețete', href: resolve(`/activities/${data.activity.id}/kitchen/recipes`) }
			]
		},
		{
			label: 'Plan',
			tabs: [
				{ label: 'Sumar', href: resolve(`/activities/${data.activity.id}/kitchen`) },
				{ label: 'Mese', href: resolve(`/activities/${data.activity.id}/kitchen/meals`) },
				{
					label: 'Aprovizionare',
					href: resolve(`/activities/${data.activity.id}/kitchen/procurement`)
				},
				{ label: 'Rapoarte', href: resolve(`/activities/${data.activity.id}/kitchen/reports`) }
			]
		}
	]);

	const isActive = (href: string) =>
		href === kitchenPath ? page.url.pathname === href : page.url.pathname.startsWith(href);
</script>

<svelte:head>
	<title>{data.activity.title} | Scouts Cluj Utilities</title>
</svelte:head>

<section class="activity-shell">
	{#if data.publication}<ActivityPublication
			activityId={data.activity.id}
			publication={data.publication}
			compact={page.url.pathname.endsWith('/registrations') ||
				page.url.pathname.endsWith('/finance/participation')}
		/>{/if}
	{#if isKitchenRoute}
		<nav class="kitchen-tabs" aria-label="Meniu bucătărie">
			{#each kitchenGroups as group (group.label)}
				<div class="kitchen-tab-group">
					<span>{group.label}</span>
					<div>
						{#each group.tabs as tab (tab.href)}
							<a href={tab.href} class:active={isActive(tab.href)}>{tab.label}</a>
						{/each}
					</div>
				</div>
			{/each}
		</nav>
	{/if}

	{@render children()}
</section>

<style>
	.activity-shell {
		display: grid;
		gap: 12px;
	}

	.kitchen-tabs {
		display: flex;
		overflow-x: auto;
		gap: 10px;
		align-items: center;
		border-bottom: 1px solid #dbe3ef;
		padding-bottom: 8px;
	}

	.kitchen-tab-group {
		display: grid;
		gap: 3px;
		border: 1px solid var(--sc-border);
		border-radius: 8px;
		padding: 4px;
		background: var(--sc-surface);
	}

	.kitchen-tab-group span {
		padding: 0 7px;
		color: #94a3b8;
		font-size: 0.68rem;
		font-weight: 600;
		text-transform: uppercase;
	}

	.kitchen-tab-group div {
		display: flex;
		gap: 4px;
	}

	.kitchen-tabs a {
		min-height: 34px;
		display: inline-flex;
		align-items: center;
		border: 1px solid transparent;
		border-radius: 8px;
		background: var(--sc-canvas);
		padding: 0 12px;
		color: #475569;
		font-size: 0.9rem;
		font-weight: 600;
		text-decoration: none;
		white-space: nowrap;
	}

	.kitchen-tabs a.active,
	.kitchen-tabs a:hover {
		border-color: #dbe3ef;
		background: var(--sc-surface);
		color: var(--sc-accent-hover);
	}
</style>

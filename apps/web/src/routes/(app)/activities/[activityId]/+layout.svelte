<script lang="ts">
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
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 4px;
		background: #ffffff;
	}

	.kitchen-tab-group span {
		padding: 0 7px;
		color: #94a3b8;
		font-size: 0.68rem;
		font-weight: 900;
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
		background: #f8fafc;
		padding: 0 12px;
		color: #475569;
		font-size: 0.9rem;
		font-weight: 800;
		text-decoration: none;
		white-space: nowrap;
	}

	.kitchen-tabs a.active,
	.kitchen-tabs a:hover {
		border-color: #dbe3ef;
		background: #ffffff;
		color: #991b1b;
	}
</style>

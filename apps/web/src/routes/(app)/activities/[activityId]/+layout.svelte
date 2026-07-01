<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { ActivityStatus, ActivityType } from './+layout.server';

	let { data, children } = $props();

	const activityTypeLabels: Record<ActivityType, string> = {
		camp: 'Camp',
		hike: 'Drumeție',
		festival: 'Festival',
		training: 'Formare',
		meeting: 'Întâlnire',
		other: 'Alt tip'
	};

	const activityStatusLabels: Record<ActivityStatus, string> = {
		planned: 'Planificată',
		active: 'În desfășurare',
		completed: 'Încheiată',
		cancelled: 'Anulată'
	};

	const formatDate = (value?: string) =>
		value
			? new Intl.DateTimeFormat('ro-RO', {
					dateStyle: 'medium'
				}).format(new Date(value))
			: 'Fără dată';

	const activityPath = $derived(resolve(`/activities/${data.activity.id}`));
	const financePath = $derived(resolve(`/activities/${data.activity.id}/finance`));
	const kitchenPath = $derived(resolve(`/activities/${data.activity.id}/kitchen`));
	const auditPath = $derived(resolve(`/activities/${data.activity.id}/audit`));
	const isOverviewRoute = $derived(page.url.pathname === activityPath);
	const isKitchenRoute = $derived(page.url.pathname.startsWith(kitchenPath));
	const departmentLabel = $derived(
		isKitchenRoute
			? 'Departament · Bucătărie'
			: page.url.pathname.startsWith(financePath)
				? 'Departament · Financiar'
				: page.url.pathname.startsWith(auditPath)
					? 'Utilitar · Audit'
					: 'Activitate'
	);
	const kitchenTabs = $derived([
		{ label: 'Mese', href: resolve(`/activities/${data.activity.id}/kitchen/meals`) },
		{ label: 'Ingrediente', href: resolve(`/activities/${data.activity.id}/kitchen/ingredients`) },
		{ label: 'Rețete', href: resolve(`/activities/${data.activity.id}/kitchen/recipes`) },
		{
			label: 'Aprovizionare',
			href: resolve(`/activities/${data.activity.id}/kitchen/procurement`)
		},
		{ label: 'Rapoarte', href: resolve(`/activities/${data.activity.id}/kitchen/reports`) }
	]);

	const isActive = (href: string) => page.url.pathname.startsWith(href);
</script>

<svelte:head>
	<title>{data.activity.title} | Scouts Cluj Utilities</title>
</svelte:head>

<section class="activity-shell">
	<a class="back-link" href={resolve('/activities')}>Înapoi la activități</a>

	{#if isOverviewRoute}
		<header class="activity-header">
			<p class="eyebrow">{activityTypeLabels[data.activity.type]}</p>
			<h1>{data.activity.title}</h1>
			<div class="meta-grid">
				<span>{activityStatusLabels[data.activity.status]}</span>
				<span>{formatDate(data.activity.startDate)}</span>
				<span>{data.activity.location ?? 'Fără loc'}</span>
				<span>{data.activity.coordinatorName}</span>
			</div>
		</header>
	{:else}
		<header class="activity-context">
			<div>
				<p class="eyebrow">{departmentLabel}</p>
				<h1>{data.activity.title}</h1>
			</div>
			<div class="meta-grid compact">
				<span>{activityStatusLabels[data.activity.status]}</span>
				<span>{formatDate(data.activity.startDate)}</span>
				<span>{data.activity.location ?? 'Fără loc'}</span>
			</div>
		</header>
	{/if}

	{#if isKitchenRoute}
		<nav class="kitchen-tabs" aria-label="Meniu bucătărie">
			{#each kitchenTabs as tab (tab.href)}
				<a href={tab.href} class:active={isActive(tab.href)}>{tab.label}</a>
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

	.back-link,
	.kitchen-tabs a {
		color: #334155;
		font-weight: 800;
		text-decoration: none;
	}

	.back-link {
		justify-self: start;
	}

	.activity-header,
	.activity-context {
		display: grid;
		gap: 8px;
	}

	.activity-context {
		grid-template-columns: minmax(0, 1fr);
		border-bottom: 1px solid #dbe3ef;
		padding-bottom: 10px;
	}

	.eyebrow {
		margin: 0;
		color: #2563eb;
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	h1,
	p {
		margin: 0;
	}

	h1 {
		color: #0f172a;
		line-height: 1.08;
	}

	.activity-header h1 {
		font-size: 2rem;
	}

	.activity-context h1 {
		font-size: 1.35rem;
	}

	.meta-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		color: #64748b;
	}

	.meta-grid span {
		border-right: 1px solid #cbd5e1;
		padding-right: 8px;
	}

	.meta-grid span:last-child {
		border-right: 0;
		padding-right: 0;
	}

	.meta-grid.compact {
		font-size: 0.9rem;
	}

	.kitchen-tabs {
		display: flex;
		overflow-x: auto;
		gap: 6px;
		align-items: center;
		border-bottom: 1px solid #dbe3ef;
		padding-bottom: 8px;
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
		white-space: nowrap;
	}

	.kitchen-tabs a.active,
	.kitchen-tabs a:hover {
		border-color: #dbe3ef;
		background: #ffffff;
		color: #991b1b;
	}

	@media (min-width: 720px) {
		.activity-context {
			grid-template-columns: minmax(0, 1fr) auto;
			align-items: end;
		}
	}
</style>

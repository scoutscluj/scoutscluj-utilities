<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { hasRole } from '$lib/auth/roles';
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

	const canViewAudit = $derived(
		data.activity.coordinatorId === data.user.id ||
			hasRole(data.user, 'finance_manager') ||
			hasRole(data.user, 'super_admin')
	);

	const activityTabs = $derived([
		{ label: 'Prezentare', href: resolve(`/activities/${data.activity.id}`), exact: true },
		{ label: 'Financiar', href: resolve(`/activities/${data.activity.id}/finance`), exact: false },
		{ label: 'Bucătărie', href: resolve(`/activities/${data.activity.id}/kitchen`), exact: true }
	]);

	const kitchenPath = $derived(resolve(`/activities/${data.activity.id}/kitchen`));
	const isKitchenRoute = $derived(page.url.pathname.startsWith(kitchenPath));
	const kitchenTabs = $derived([
		{ label: 'Mese', href: resolve(`/activities/${data.activity.id}/kitchen/meals`) },
		{ label: 'Ingrediente', href: resolve(`/activities/${data.activity.id}/kitchen/ingredients`) },
		{ label: 'Rețete', href: resolve(`/activities/${data.activity.id}/kitchen/recipes`) },
		{ label: 'Aprovizionare', href: resolve(`/activities/${data.activity.id}/kitchen/procurement`) },
		{ label: 'Rapoarte', href: resolve(`/activities/${data.activity.id}/kitchen/reports`) }
	]);

	const isActive = (href: string, exact = false) =>
		exact ? page.url.pathname === href : page.url.pathname.startsWith(href);
</script>

<svelte:head>
	<title>{data.activity.title} | Scouts Cluj Utilities</title>
</svelte:head>

<section class="activity-shell">
	<a class="back-link" href={resolve('/activities')}>Înapoi la activități</a>

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

	<nav class="tabs" aria-label="Secțiuni activitate">
		{#each activityTabs as tab (tab.href)}
			<a href={tab.href} class:active={isActive(tab.href, tab.exact)}>{tab.label}</a>
		{/each}
		{#if isKitchenRoute}
			<span class="tab-separator" aria-hidden="true"></span>
			{#each kitchenTabs as tab (tab.href)}
				<a class="kitchen-tab" href={tab.href} class:active={isActive(tab.href)}>{tab.label}</a>
			{/each}
		{/if}
		{#if canViewAudit}
			<a
				href={resolve(`/activities/${data.activity.id}/audit`)}
				class:active={isActive(resolve(`/activities/${data.activity.id}/audit`))}
			>
				Audit
			</a>
		{/if}
	</nav>

	{@render children()}
</section>

<style>
	.activity-shell {
		display: grid;
		gap: 14px;
	}

	.back-link,
	.tabs a {
		color: #334155;
		font-weight: 800;
		text-decoration: none;
	}

	.back-link {
		justify-self: start;
	}

	.activity-header {
		display: grid;
		gap: 8px;
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
		font-size: clamp(1.7rem, 3vw, 2.4rem);
		line-height: 1.08;
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

	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: center;
		border-bottom: 1px solid #dbe3ef;
		padding-bottom: 8px;
	}

	.tabs a {
		min-height: 36px;
		display: inline-flex;
		align-items: center;
		border: 1px solid transparent;
		border-radius: 8px;
		padding: 0 12px;
	}

	.tabs a.kitchen-tab {
		min-height: 32px;
		background: #f8fafc;
		color: #475569;
		font-size: 0.9rem;
	}

	.tabs a.active,
	.tabs a:hover {
		border-color: #dbe3ef;
		background: #ffffff;
		color: #991b1b;
	}

	.tab-separator {
		width: 1px;
		height: 24px;
		background: #cbd5e1;
	}

	@media (max-width: 640px) {
		.tab-separator {
			display: none;
		}
	}
</style>

<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Activity, ActivityDepartment } from './+layout.server';
	import type { KitchenOverview } from './kitchen/kitchen-api';

	type Props = {
		activity: Activity;
		kitchenOverview?: KitchenOverview;
		registrationAccess?: boolean;
	};

	type DepartmentCard = {
		id: ActivityDepartment;
		label: string;
		href?: ReturnType<typeof resolve>;
		signals?: string[];
		features?: Array<{ label: string; href: ReturnType<typeof resolve> }>;
	};

	let { activity, kitchenOverview, registrationAccess = false }: Props = $props();

	const hasDepartment = (department: ActivityDepartment) =>
		activity.departments.includes(department);
	const kitchenGaps = $derived(
		kitchenOverview
			? kitchenOverview.mealCoverage.flatMap((meal) =>
					meal.items.filter((item) => item.state !== 'covered')
				).length
			: 0
	);
	const kitchenMeals = $derived(kitchenOverview?.meals.length ?? 0);
	const buildCards = () => {
		const items: DepartmentCard[] = [];
		if (hasDepartment('finance')) {
			items.push({
				id: 'finance',
				label: 'Financiar',
				href: resolve(`/activities/${activity.id}/finance`),
				signals: [
					`${activity.financeSummary.openDocuments} ${activity.financeSummary.openDocuments === 1 ? 'document deschis' : 'documente deschise'}`,
					`${activity.financeSummary.needsClarification} ${activity.financeSummary.needsClarification === 1 ? 'clarificare' : 'clarificări'}`,
					`${activity.financeSummary.sentDocuments} ${activity.financeSummary.sentDocuments === 1 ? 'document trimis' : 'documente trimise'}`
				]
			});
		}
		if (hasDepartment('kitchen')) {
			items.push({
				id: 'kitchen',
				label: 'Bucătărie',
				href: resolve(`/activities/${activity.id}/kitchen`),
				signals: kitchenOverview
					? [
							`${kitchenMeals} ${kitchenMeals === 1 ? 'masă planificată' : 'mese planificate'}`,
							`${kitchenGaps} ${kitchenGaps === 1 ? 'nevoie neacoperită' : 'nevoi neacoperite'}`,
							`${kitchenOverview.condimentReminders.length} condimente`
						]
					: ['Sumarul este disponibil pentru echipa care gestionează bucătăria']
			});
		}
		if (hasDepartment('administrative') && registrationAccess)
			items.unshift({
				id: 'administrative',
				label: 'Înscrieri și acorduri',
				href: resolve(`/activities/${activity.id}/registrations`),
				signals: ['Participanți, AP și numerar']
			});
		return items;
	};
	const cards = $derived(buildCards());
</script>

{#if cards.length}
	<section class="department-grid" aria-label="Departamente active">
		{#each cards as card (card.id)}
			{#if card.href}
				<a class="department-card" href={card.href}>
					<strong>{card.label}</strong>
					<ul>
						{#each card.signals ?? [] as signal (signal)}
							<li>{signal}</li>
						{/each}
					</ul>
				</a>
			{:else}
				<article class="department-card" class:inactive={!card.features?.length}>
					<strong>{card.label}</strong>
					{#if card.features?.length}
						<ul class="feature-list">
							{#each card.features as feature (feature.label)}
								<li><a href={feature.href}>{feature.label}</a></li>
							{/each}
						</ul>
					{:else}
						<ul>
							{#each card.signals ?? [] as signal (signal)}
								<li>{signal}</li>
							{/each}
						</ul>
					{/if}
				</article>
			{/if}
		{/each}
	</section>
{/if}

<style>
	@media (max-width: 600px) {
		.department-card {
			min-height: 0;
			padding: 14px 16px;
			gap: 6px;
		}
	}

	.department-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 12px;
	}

	.department-card {
		min-height: 104px;
		display: grid;
		gap: 10px;
		align-content: start;
		border: 1px solid var(--sc-border);
		border-radius: 8px;
		background: var(--sc-surface);
		padding: 14px;
		color: var(--sc-ink);
		text-decoration: none;
		box-shadow: var(--sc-shadow);
	}

	a.department-card:hover {
		border-color: var(--sc-link);
	}

	.department-card.inactive {
		background: var(--sc-canvas);
		color: var(--sc-muted);
	}

	strong {
		color: var(--sc-ink);
		font-size: 1rem;
	}

	ul {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 12px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		font-size: 0.9rem;
	}

	.feature-list a {
		color: var(--sc-success);
		font-weight: 600;
	}

	.feature-list a:hover {
		color: var(--sc-link);
	}

	@media (max-width: 760px) {
		.department-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

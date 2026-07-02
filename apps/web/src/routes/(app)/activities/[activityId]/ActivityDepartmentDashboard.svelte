<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Activity, ActivityDepartment } from './+layout.server';
	import type { KitchenOverview } from './kitchen/kitchen-api';

	type Props = {
		activity: Activity;
		kitchenOverview?: KitchenOverview;
	};

	type DepartmentCard = {
		id: ActivityDepartment;
		label: string;
		href?: ReturnType<typeof resolve>;
		signals: string[];
	};

	let { activity, kitchenOverview }: Props = $props();

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
					`${activity.financeSummary.openDocuments} documente deschise`,
					`${activity.financeSummary.needsClarification} clarificări`,
					`${activity.financeSummary.sentDocuments} trimise`
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
							`${kitchenMeals} mese planificate`,
							`${kitchenGaps} nevoi neacoperite`,
							`${kitchenOverview.condimentReminders.length} condimente`
						]
					: ['Sumarul este disponibil pentru echipa care gestionează bucătăria']
			});
		}
		if (hasDepartment('program')) {
			items.push({
				id: 'program',
				label: 'Program',
				signals: ['Departament activ', 'Pagina nu este implementată încă']
			});
		}
		if (hasDepartment('logistics')) {
			items.push({
				id: 'logistics',
				label: 'Logistică',
				signals: ['Departament activ', 'Pagina nu este implementată încă']
			});
		}
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
						{#each card.signals as signal (signal)}
							<li>{signal}</li>
						{/each}
					</ul>
				</a>
			{:else}
				<article class="department-card inactive">
					<strong>{card.label}</strong>
					<ul>
						{#each card.signals as signal (signal)}
							<li>{signal}</li>
						{/each}
					</ul>
				</article>
			{/if}
		{/each}
	</section>
{/if}

<style>
	.department-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}

	.department-card {
		min-height: 134px;
		display: grid;
		gap: 10px;
		align-content: start;
		border: 1px solid #dbe3ef;
		border-radius: 8px;
		background: #ffffff;
		padding: 14px;
		color: #334155;
		text-decoration: none;
		box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
	}

	a.department-card:hover {
		border-color: #991b1b;
	}

	.department-card.inactive {
		background: #f8fafc;
		color: #64748b;
	}

	strong {
		color: #0f172a;
		font-size: 1rem;
	}

	ul {
		display: grid;
		gap: 6px;
		margin: 0;
		padding-left: 18px;
	}

	li {
		font-size: 0.9rem;
	}

	@media (max-width: 760px) {
		.department-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

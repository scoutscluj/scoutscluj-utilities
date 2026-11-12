<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Activity } from './+layout.server';
	import type { KitchenOverview } from './kitchen/kitchen-api';

	type Props = {
		activity: Activity;
		canManage: boolean;
		kitchenOverview?: KitchenOverview;
	};

	type Issue = {
		label: string;
		href: ReturnType<typeof resolve>;
	};

	let { activity, canManage, kitchenOverview }: Props = $props();

	const emptyKitchenDays = $derived(
		kitchenOverview
			? kitchenOverview.days.filter(
					(day) => !kitchenOverview.meals.some((meal) => meal.kitchenDayId === day.id)
				).length
			: 0
	);
	const staleRecipes = $derived(
		kitchenOverview
			? kitchenOverview.meals.flatMap((meal) => meal.recipes).filter((recipe) => recipe.isStale)
					.length
			: 0
	);
	const coverageGaps = $derived(
		kitchenOverview
			? kitchenOverview.mealCoverage.flatMap((meal) =>
					meal.items.filter((item) => item.state !== 'covered')
				).length
			: 0
	);
	const isIssue = (issue: Issue | undefined): issue is Issue => Boolean(issue);
	const issues = $derived(
		(
			[
				canManage && (!activity.startDate || !activity.endDate)
					? {
							label: 'Lipsesc datele activității',
							href: resolve(`/activities/${activity.id}/settings`)
						}
					: undefined,
				canManage && activity.departments.length === 0
					? {
							label: 'Nu este activ niciun departament',
							href: resolve(`/activities/${activity.id}/settings`)
						}
					: undefined,
				activity.financeSummary.needsClarification > 0
					? {
							label: `${activity.financeSummary.needsClarification} ${activity.financeSummary.needsClarification === 1 ? 'document necesită clarificări' : 'documente necesită clarificări'}`,
							href: resolve(`/activities/${activity.id}/finance`)
						}
					: undefined,
				canManage && kitchenOverview && !kitchenOverview.plan.hasCompleteActivityDates
					? {
							label: 'Bucătăria are nevoie de perioada activității',
							href: resolve(`/activities/${activity.id}/settings`)
						}
					: undefined,
				emptyKitchenDays > 0
					? {
							label: `${emptyKitchenDays} ${emptyKitchenDays === 1 ? 'zi fără mese planificate' : 'zile fără mese planificate'}`,
							href: resolve(`/activities/${activity.id}/kitchen/meals`)
						}
					: undefined,
				staleRecipes > 0
					? {
							label: `${staleRecipes} ${staleRecipes === 1 ? 'rețetă atribuită diferă de catalog' : 'rețete atribuite diferă de catalog'}`,
							href: resolve(`/activities/${activity.id}/kitchen/meals`)
						}
					: undefined,
				coverageGaps > 0
					? {
							label: `${coverageGaps} ${coverageGaps === 1 ? 'nevoie de aprovizionare neacoperită' : 'nevoi de aprovizionare neacoperite'}`,
							href: resolve(`/activities/${activity.id}/kitchen/procurement`)
						}
					: undefined
			] satisfies Array<Issue | undefined>
		).filter(isIssue)
	);
</script>

{#if issues.length}<section class="attention-strip">
		<strong>{issues.length ? 'Atenție' : 'Totul arată bine'}</strong>
		{#if issues.length}
			<div>
				{#each issues.slice(0, 5) as issue (issue.label)}
					<a href={issue.href}>{issue.label}</a>
				{/each}
			</div>
		{:else}
			<span>Nu sunt semnale urgente pentru această activitate.</span>
		{/if}
	</section>{/if}

<style>
	.attention-strip {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
		border: 1px solid var(--sc-warning);
		border-radius: 8px;
		background: var(--sc-warning-soft);
		padding: 12px 14px;
	}

	strong {
		color: var(--sc-warning);
	}

	div {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	a,
	span {
		color: var(--sc-ink);
		font-size: 0.9rem;
		font-weight: 760;
	}

	a {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
</style>

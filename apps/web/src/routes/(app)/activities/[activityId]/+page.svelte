<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import ActionMenu from '$lib/components/ui/ActionMenu.svelte';
	import ActivityAttentionStrip from './ActivityAttentionStrip.svelte';
	import ActivityDepartmentDashboard from './ActivityDepartmentDashboard.svelte';
	import ActivityOverviewPanel from './ActivityOverviewPanel.svelte';
	import ActivityRecentAudit from './ActivityRecentAudit.svelte';
	import ActivitySetupPanel from './ActivitySetupPanel.svelte';
	import { canManageActivity } from './activity-meta';

	let { data } = $props();

	const canManage = $derived(canManageActivity(data.activity, data.user));
</script>

<section class="activity-dashboard">
	<header class="overview-heading">
		<h1>Prezentare</h1>
		<div class="overview-actions">
			{#if data.registrationAccess.manage || data.registrationAccess.finance || data.registrationAccess.sensitive}<a
					class="registration-action"
					href={resolve(`/activities/${data.activity.id}/registrations`)}>Înscrieri</a
				>{/if}<ActionMenu
				label="Acțiuni activitate"
				items={[
					...(canManage
						? [
								{
									label: 'Setările activității',
									action: () => {
										void goto(resolve(`/activities/${data.activity.id}/settings`));
									}
								}
							]
						: []),
					{
						label: 'Istoricul activității',
						action: () => {
							void goto(resolve(`/activities/${data.activity.id}/audit`));
						}
					}
				]}
			/>
		</div>
	</header>
	<ActivityAttentionStrip
		activity={data.activity}
		{canManage}
		kitchenOverview={data.kitchenOverview}
	/>
	<ActivityDepartmentDashboard
		activity={data.activity}
		kitchenOverview={data.kitchenOverview}
		registrationAccess={data.registrationAccess.manage ||
			data.registrationAccess.finance ||
			data.registrationAccess.sensitive}
	/>
	<ActivityOverviewPanel activity={data.activity} />
	{#if canManage}<details class="secondary-panel">
			<summary>Configurarea activității</summary><ActivitySetupPanel activity={data.activity} />
		</details>{/if}
	<ActivityRecentAudit activity={data.activity} entries={data.auditEntries} />
</section>

<style>
	.overview-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		min-height: 44px;
	}
	h1 {
		margin: 0;
		font-size: clamp(24px, 3vw, 30px);
		letter-spacing: -0.025em;
	}
	.overview-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.registration-action {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 8px 14px;
		border-radius: 7px;
		background: var(--sc-accent);
		color: var(--sc-on-accent);
		font-size: 14px;
		font-weight: 600;
		text-decoration: none;
	}
	.registration-action:focus-visible {
		outline: 2px solid var(--sc-focus);
		outline-offset: 2px;
	}
	.secondary-panel summary {
		min-height: 44px;
		display: flex;
		align-items: center;
		cursor: pointer;
		color: var(--sc-muted);
		font-size: 14px;
	}
	.secondary-panel summary::before {
		content: '›';
		margin-right: 8px;
	}
	.secondary-panel[open] summary::before {
		transform: rotate(90deg);
	}

	.activity-dashboard {
		display: grid;
		gap: 14px;
	}
</style>

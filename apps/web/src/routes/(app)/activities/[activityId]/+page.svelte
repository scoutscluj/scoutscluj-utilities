<script lang="ts">
	import { resolve } from '$app/paths';
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
	{#if data.registrationAccess.manage || data.registrationAccess.finance || data.registrationAccess.sensitive}<a
			href={resolve(`/activities/${data.activity.id}/registrations`)}
			>Înscrieri, taxe și acorduri →</a
		>{/if}
	<ActivityOverviewPanel activity={data.activity} />
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
	{#if canManage}
		<ActivitySetupPanel activity={data.activity} />
	{/if}
	<ActivityRecentAudit activity={data.activity} entries={data.auditEntries} />
</section>

<style>
	.activity-dashboard {
		display: grid;
		gap: 14px;
	}
</style>

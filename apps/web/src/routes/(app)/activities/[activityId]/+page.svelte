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
	{#if canManage}<section class="public-page">
			<h2>Pagina publică a activității</h2>
			<p>
				Completează datele acordului, stabilește taxa și publică înscrierile. Apoi distribuie pagina
				participanților.
			</p>
			<div>
				<a href={resolve(`/activities/${data.activity.id}/registrations`)}
					>Pregătește pagina și înscrierile →</a
				><a href={resolve(`/activitati/${data.activity.id}`)}>Vezi pagina publică →</a>
			</div>
		</section>{/if}
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
	.public-page {
		padding: 20px;
		background: var(--sc-surface);
		border: 1px solid var(--sc-border);
		border-radius: 10px;
	}
	.public-page h2 {
		margin-top: 0;
		font-size: 1.2rem;
	}
	.public-page div {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
	}
	.activity-dashboard {
		display: grid;
		gap: 14px;
	}
</style>

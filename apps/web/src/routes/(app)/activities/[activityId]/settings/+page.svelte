<script lang="ts">
	import ActivityDepartmentForm from '../ActivityDepartmentForm.svelte';
	import ActivityDetailsForm from '../ActivityDetailsForm.svelte';
	import ActivityTeamForm from '$lib/activities/ActivityTeamForm.svelte';
	import RegistrationSettingsEditor from '$lib/activities/RegistrationSettings.svelte';

	let { data, form } = $props();
</script>

<section class="settings-page">
	<h1>Setările activității</h1>
	<nav aria-label="Secțiuni setări">
		<a href="#echipa">Echipă</a><a href="#inscrieri">Înscrieri</a><a href="#acord"
			>Acord de participare</a
		><a href="#plati">Taxă și plată</a>
	</nav>
	<ActivityDetailsForm activity={data.activity} message={form?.detailsMessage} />
	<ActivityDepartmentForm
		activity={data.activity}
		user={data.user}
		message={form?.departmentMessage}
	/>
	<ActivityTeamForm activity={data.activity} users={data.teamOptions} message={form?.teamMessage} />
	{#if data.registrationOverview.settings && data.registrationOverview.priceAdvice}{#key data.registrationOverview.revision}<RegistrationSettingsEditor
				activityId={data.activity.id}
				initial={data.registrationOverview.settings}
				revision={data.registrationOverview.revision}
				lists={data.registrationOverview.lists}
				fee={data.registrationOverview.priceAdvice.fee}
			/>{/key}{/if}
</section>

<style>
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
	}
	nav a {
		color: var(--sc-accent);
	}
	.settings-page {
		display: grid;
		gap: 14px;
	}
</style>

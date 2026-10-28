<script lang="ts">
	import RegistrationSettingsEditor from './RegistrationSettings.svelte';
	import type { Overview } from './registration';
	let {
		data,
		section
	}: {
		data: { activity: { id: number }; registrationOverview: Overview };
		section: 'registration' | 'consent' | 'payment';
	} = $props();
</script>

{#if data.registrationOverview.settings && data.registrationOverview.priceAdvice}
	<RegistrationSettingsEditor
		{section}
		activityId={data.activity.id}
		initial={data.registrationOverview.settings}
		revision={data.registrationOverview.revision}
		lists={data.registrationOverview.lists}
		fee={data.registrationOverview.priceAdvice.fee}
	/>
{/if}

<script lang="ts">
	import ActivityRegistrationSettingsPage from '$lib/activities/ActivityRegistrationSettingsPage.svelte';
	let { data } = $props();
</script>

<ActivityRegistrationSettingsPage {data} section="consent" />

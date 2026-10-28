<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		activitySettingsHref,
		type ActivitySettingsSection
	} from '$lib/activities/activity-settings';
	import ActivityDetailsForm from '../ActivityDetailsForm.svelte';
	let { data, form } = $props();
	onMount(() => {
		const legacy: Record<string, ActivitySettingsSection> = {
			'#echipa': 'team',
			'#inscrieri': 'registrations',
			'#acord': 'consent',
			'#plati': 'payments'
		};
		const section = legacy[page.url.hash];
		if (section) void goto(activitySettingsHref(data.activity.id, section), { replaceState: true });
	});
</script>

<ActivityDetailsForm activity={data.activity} message={form?.detailsMessage} />

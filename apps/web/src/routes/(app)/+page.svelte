<script lang="ts">
	import type { PageData } from './$types';
	import DashboardCalendars from '$lib/dashboard-calendars/DashboardCalendars.svelte';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Dashboard | Scouts Cluj Utilities</title></svelte:head>

{#key data.now}<DashboardCalendars {...data} />{/key}

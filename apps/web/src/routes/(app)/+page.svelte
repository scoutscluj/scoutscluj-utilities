<script lang="ts">
	import type { PageData } from './$types';
	import DashboardCalendars from '$lib/dashboard-calendars/DashboardCalendars.svelte';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Dashboard | Scouts Cluj Utilities</title></svelte:head>

<h1>Acasă</h1>

{#key data.now}<DashboardCalendars {...data} />{/key}

<style>
	h1 {
		margin: 0 0 16px;
		color: var(--sc-ink);
		font-size: clamp(24px, 3vw, 30px);
		line-height: 1.2;
		letter-spacing: -0.025em;
		overflow-wrap: anywhere;
	}
</style>

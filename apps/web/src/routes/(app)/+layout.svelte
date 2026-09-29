<script lang="ts">
	import AppShell from './AppShell.svelte';

	let { data, children } = $props();
</script>

<AppShell user={data.user} sidebarActivities={data.sidebarActivities} {children} />

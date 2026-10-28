<script lang="ts">
	import RegistrationWorkspace from '$lib/activities/RegistrationWorkspace.svelte';
	let { data } = $props();
</script>

<RegistrationWorkspace {data} view="payments" />

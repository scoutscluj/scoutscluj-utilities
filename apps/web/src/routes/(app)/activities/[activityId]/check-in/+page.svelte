<script lang="ts">
	import RegistrationCheckIn from '$lib/activities/RegistrationCheckIn.svelte';
	let { data } = $props();
</script>

<RegistrationCheckIn {data} />

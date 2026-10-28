<script lang="ts">
	import ActivityTeamForm from '$lib/activities/ActivityTeamForm.svelte';
	let { data, form } = $props();
</script>

<ActivityTeamForm activity={data.activity} users={data.teamOptions} message={form?.teamMessage} />

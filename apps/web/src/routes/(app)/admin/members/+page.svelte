<script lang="ts">
	import MemberWorkspace from '$lib/members/MemberWorkspace.svelte';
	let { data, form } = $props();
</script>

<MemberWorkspace {data} {form} management />

<script lang="ts">
	import Content from '../../../units/structures/+page.svelte';
	let { data, form } = $props();
</script>

<Content {data} {form} />

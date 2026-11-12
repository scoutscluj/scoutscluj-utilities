<script lang="ts">
	import { Toaster as Sonner, type ToasterProps } from 'svelte-sonner';
	import { appearance } from '$lib/styles/appearance.svelte';

	let { ...restProps }: ToasterProps = $props();
</script>

<Sonner
	theme={appearance.preference}
	position="top-right"
	richColors
	closeButton
	class="toaster group"
	toastOptions={{
		style:
			'border-radius: 8px; background: var(--sc-surface); color: var(--sc-ink); border-color: var(--sc-border-strong); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif;'
	}}
	{...restProps}
/>

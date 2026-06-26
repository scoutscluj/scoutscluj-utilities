<script lang="ts">
	import { Toaster as Sonner, type ToasterProps } from 'svelte-sonner';

	let { ...restProps }: ToasterProps = $props();
</script>

<Sonner
	position="top-right"
	richColors
	closeButton
	class="toaster group"
	toastOptions={{
		style:
			'border-radius: 8px; border-color: #d8dee6; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif;'
	}}
	{...restProps}
/>

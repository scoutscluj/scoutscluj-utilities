<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { X } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	let {
		open = $bindable(false),
		wide = false,
		title,
		description,
		children
	}: {
		open?: boolean;
		wide?: boolean;
		title: string;
		description?: string;
		children: Snippet;
	} = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="sc-dialog-overlay" />
		<Dialog.Content class={wide ? 'sc-dialog-content sc-dialog-wide' : 'sc-dialog-content'}>
			<header class="sc-dialog-heading">
				<div>
					<Dialog.Title class="sc-dialog-title">{title}</Dialog.Title>
					{#if description}<Dialog.Description class="sc-dialog-description"
							>{description}</Dialog.Description
						>{/if}
				</div>
				<Dialog.Close class="sc-icon-button" aria-label="Închide dialogul"
					><X size={18} /></Dialog.Close
				>
			</header>
			<div class="sc-dialog-body">{@render children()}</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

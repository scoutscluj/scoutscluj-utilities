<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import { Ellipsis } from '@lucide/svelte';
	let {
		label,
		items
	}: {
		label: string;
		items: { label: string; action: () => void; destructive?: boolean; disabled?: boolean }[];
	} = $props();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger class="sc-icon-button" aria-label={label}
		><Ellipsis size={18} /></DropdownMenu.Trigger
	>
	<DropdownMenu.Portal>
		<DropdownMenu.Content class="sc-menu-content" align="end" sideOffset={6}>
			<DropdownMenu.Group>
				{#each items as item (item.label)}
					<DropdownMenu.Item
						class="sc-menu-item"
						data-destructive={item.destructive || undefined}
						disabled={item.disabled}
						onSelect={item.action}>{item.label}</DropdownMenu.Item
					>
				{/each}
			</DropdownMenu.Group>
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>

<script lang="ts">
	import { untrack } from 'svelte';
	let {
		value = $bindable(''),
		invalid = false,
		id = 'consent-equipment',
		itemLabel = 'Echipament',
		removeLabel = 'Elimină echipamentul',
		addLabel = '+ Adaugă echipament',
		placeholder = 'De exemplu: bocanci de drumeție'
	}: {
		value?: string;
		invalid?: boolean;
		id?: string;
		itemLabel?: string;
		removeLabel?: string;
		addLabel?: string;
		placeholder?: string;
	} = $props();
	let items = $state(untrack(() => (value ? value.split('\n') : [''])));
	$effect(() => {
		if (value !== items.join('\n')) items = value ? value.split('\n') : [''];
	});
	function update(index: number, text: string) {
		items[index] = text;
		value = items.join('\n');
	}
	function remove(index: number) {
		items.splice(index, 1);
		if (!items.length) items = [''];
		value = items.join('\n');
	}
</script>

<div class="equipment-list">
	{#each items as item, index (index)}
		<div class="item">
			<input
				id={index === 0 ? id : undefined}
				aria-label={`${itemLabel} ${index + 1}`}
				aria-invalid={invalid}
				maxlength="500"
				value={item}
				oninput={(e) => update(index, e.currentTarget.value)}
				{placeholder}
			/>
			<button type="button" aria-label={`${removeLabel} ${index + 1}`} onclick={() => remove(index)}
				>×</button
			>
		</div>
	{/each}
	<button
		type="button"
		class="add"
		disabled={items.length >= 20}
		onclick={() => {
			items.push('');
			value = items.join('\n');
		}}>{addLabel}</button
	>
	<small>{items.filter((v) => v.trim()).length}/20 elemente</small>
</div>

<style>
	.equipment-list {
		display: grid;
		gap: 8px;
	}
	.item {
		display: flex;
		gap: 8px;
	}
	input {
		flex: 1;
		min-width: 0;
		padding: 9px 12px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		color: var(--sc-ink);
		background: var(--sc-surface);
	}
	input[aria-invalid='true'] {
		border-color: var(--sc-accent);
	}
	button {
		min-height: 38px;
		padding: 8px 12px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		cursor: pointer;
	}
	.add {
		justify-self: start;
	}
	small {
		color: var(--sc-muted);
	}
</style>

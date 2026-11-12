<script lang="ts">
	import Modal from './Modal.svelte';
	import { appearance, setAppearance, type ThemePreference } from '$lib/styles/appearance.svelte';
	let { open = $bindable(false) }: { open?: boolean } = $props();
	const options: { value: ThemePreference; title: string; detail: string }[] = [
		{ value: 'system', title: 'Sistem', detail: 'Urmează preferința dispozitivului.' },
		{ value: 'light', title: 'Luminoasă', detail: 'Suprafețe deschise și text închis.' },
		{
			value: 'dark',
			title: 'Întunecată',
			detail: 'Suprafețe închise, potrivite pentru lumină redusă.'
		}
	];
</script>

<Modal
	bind:open
	title="Aspectul aplicației"
	description="Alegerea se păstrează în acest browser și se aplică tuturor paginilor."
>
	<fieldset class="appearance-options">
		<legend>Tema interfeței</legend>
		{#each options as option (option.value)}
			<label class:chosen={appearance.preference === option.value}>
				<input
					type="radio"
					name="appearance"
					value={option.value}
					checked={appearance.preference === option.value}
					onchange={() => setAppearance(option.value)}
				/>
				<span><strong>{option.title}</strong><small>{option.detail}</small></span>
			</label>
		{/each}
	</fieldset>
</Modal>

<style>
	fieldset {
		border: 0;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 10px;
	}
	legend {
		font-size: 13px;
		color: var(--sc-muted);
		padding: 0 0 12px;
	}
	.appearance-options label {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 64px;
		padding: 12px;
		border: 1px solid var(--sc-control-border);
		border-radius: 8px;
		cursor: pointer;
		background: var(--sc-surface);
	}
	.appearance-options label.chosen {
		background: var(--sc-accent-soft);
		border-color: var(--sc-link);
	}
	input {
		width: 18px;
		height: 18px;
		margin: 0;
		flex-shrink: 0;
	}
	span {
		display: grid;
		gap: 3px;
	}
	strong {
		font-size: 14px;
		font-weight: 600;
		color: var(--sc-ink);
	}
	small {
		font-size: 13px;
		line-height: 1.5;
		color: var(--sc-muted);
	}
</style>

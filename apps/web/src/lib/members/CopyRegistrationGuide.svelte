<script lang="ts">
	import { page } from '$app/state';
	import Copy from '@lucide/svelte/icons/copy';
	import { registrationGuide } from './registration-guide';
	let copied = $state(false);
	let manual = $state(false);
	async function copyGuide() {
		try {
			await navigator.clipboard.writeText(registrationGuide(page.url.origin));
			copied = true;
			manual = false;
		} catch {
			manual = true;
			copied = false;
		}
	}
</script>

<div class="guide-copy">
	<button type="button" onclick={copyGuide}
		><Copy size={16} aria-hidden="true" />Copiază instrucțiunile</button
	>
	<span role="status" class="status"
		>{copied
			? 'Instrucțiuni copiate. Mesajul este gata de trimis pe WhatsApp sau email.'
			: ''}</span
	>
	{#if manual}<label
			>Copierea automată nu este disponibilă. Selectează și copiază mesajul:<textarea
				readonly
				rows="12"
				value={registrationGuide(page.url.origin)}
				onclick={(event) => event.currentTarget.select()}
			></textarea></label
		>{/if}
</div>

<style>
	.guide-copy {
		display: grid;
		gap: 8px;
		justify-items: end;
		max-width: 100%;
	}
	button {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 40px;
		padding: 8px 12px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		font: inherit;
		font-size: 13px;
		cursor: pointer;
	}
	button:hover {
		background: var(--sc-inset);
	}
	button:focus-visible,
	textarea:focus-visible {
		outline: 2px solid var(--sc-focus);
		outline-offset: 2px;
	}
	.status {
		color: var(--sc-muted);
		font-size: 12px;
		line-height: 1.5;
		text-align: right;
	}
	.status:empty {
		display: none;
	}
	label {
		display: grid;
		gap: 8px;
		width: 100%;
		font-size: 13px;
	}
	textarea {
		width: 100%;
		max-width: 100%;
		padding: 12px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		color: var(--sc-ink);
		background: var(--sc-inset);
		font: inherit;
		box-sizing: border-box;
	}
</style>

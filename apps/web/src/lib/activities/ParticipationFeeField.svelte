<script lang="ts">
	import { untrack } from 'svelte';
	import { money } from './registration';
	let {
		value = $bindable(),
		fee
	}: {
		value: number;
		fee: { percentageBasisPoints: number; fixedBani: number };
	} = $props();
	let visible = $state(false);
	let base = $state(untrack(() => value));
	const instanceId = $props.id();
	const adviceId = `${instanceId}-commission`;
	const suggestion = $derived(
		base > 0
			? Math.ceil(((base + fee.fixedBani) * 10000) / ((10000 - fee.percentageBasisPoints) * 500)) *
					500
			: 0
	);
	const estimatedFee = $derived(
		value > 0 ? Math.ceil((value * fee.percentageBasisPoints) / 10000) + fee.fixedBani : 0
	);
</script>

<div class="fee-field">
	<label
		>Taxă de participare, în lei
		<input
			type="number"
			min="0"
			step="0.01"
			required
			value={value / 100}
			oninput={(event) => {
				value = Math.round(Number(event.currentTarget.value) * 100);
				base = value;
				visible = value > 0;
			}}
		/>
	</label>
	{#if value > 0}<button
			type="button"
			class="info-toggle"
			aria-label="Informații despre comision"
			title="Informații despre comision"
			aria-expanded={visible}
			aria-controls={adviceId}
			onclick={() => (visible = !visible)}>ⓘ</button
		>{/if}
</div>
{#if visible && value > 0}
	<aside id={adviceId} class="fee-advice" aria-label="Comisionul plății cu cardul">
		<p>
			Comision card: {fee.percentageBasisPoints / 100}% + {money(fee.fixedBani)} — aproximativ {money(
				estimatedFee
			)} la taxa introdusă. Pentru a păstra {money(base)} după comision, recomandăm
			<strong>{money(suggestion)}</strong>, rotunjit în sus la 5 lei.
		</p>
		<div class="actions">
			<button
				type="button"
				onclick={() => {
					value = suggestion;
					visible = false;
				}}>Aplică prețul recomandat</button
			><button type="button" class="hide" onclick={() => (visible = false)}>Ascunde</button>
		</div>
	</aside>
{/if}

<style>
	.fee-field {
		display: flex;
		align-items: end;
		gap: 8px;
	}
	label {
		display: grid;
		gap: 6px;
		width: min(100%, 280px);
	}
	input {
		width: 100%;
		min-height: 38px;
		padding: 8px 10px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		font: inherit;
		font-variant-numeric: tabular-nums;
	}
	button {
		min-height: 38px;
		padding: 6px 12px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		font: inherit;
		cursor: pointer;
	}
	button:hover {
		background: var(--sc-canvas);
	}
	button:focus-visible,
	input:focus-visible {
		outline: 2px solid var(--sc-accent);
		outline-offset: 2px;
	}
	.info-toggle {
		width: 38px;
		flex-shrink: 0;
		padding: 0;
		color: var(--sc-ink-muted);
		font-size: 20px;
	}
	.fee-advice {
		display: grid;
		gap: 8px;
		padding: 10px 12px;
		border-left: 2px solid var(--sc-border);
		background: var(--sc-canvas);
		font-size: 13px;
	}
	p {
		margin: 0;
		line-height: 1.5;
		color: var(--sc-ink-muted);
	}
	strong {
		color: var(--sc-ink);
	}
	.actions {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.hide {
		border-color: transparent;
		background: transparent;
	}
</style>

<script lang="ts">
	import { pwa } from '$lib/pwa/pwa.svelte';

	const label = $derived(pwa.isOffline ? 'Offline' : pwa.isStandalone ? 'Instalat' : 'Online');
	const tone = $derived(pwa.isOffline ? 'warning' : pwa.isStandalone ? 'success' : 'neutral');
	const title = $derived(
		pwa.isOffline
			? 'Conexiunea nu este disponibilă'
			: pwa.isStandalone
				? 'Aplicația rulează instalată'
				: 'Conexiune activă'
	);
</script>

<button
	type="button"
	class="status-chip"
	class:warning={tone === 'warning'}
	class:success={tone === 'success'}
	{title}
	aria-label={title}
	onclick={() => pwa.openInstallPrompt()}
>
	<span aria-hidden="true"></span>
	<strong>{label}</strong>
</button>

<style>
	.status-chip {
		min-height: 32px;
		display: inline-flex;
		align-items: center;
		gap: 7px;
		border: 1px solid #cbd5e1;
		border-radius: 999px;
		background: #ffffff;
		padding: 0 10px;
		color: #475569;
		font-size: 0.78rem;
		font-weight: 850;
		cursor: pointer;
		white-space: nowrap;
	}

	.status-chip span {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		background: #16a34a;
	}

	.status-chip.warning {
		border-color: #f59e0b;
		background: #fffbeb;
		color: #92400e;
	}

	.status-chip.warning span {
		background: #f59e0b;
	}

	.status-chip.success {
		border-color: #86efac;
		background: #f0fdf4;
		color: #166534;
	}

	.status-chip strong {
		font: inherit;
	}

	@media (max-width: 700px) {
		.status-chip {
			width: 32px;
			justify-content: center;
			padding: 0;
		}

		.status-chip strong {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip: rect(0 0 0 0);
			white-space: nowrap;
		}
	}
</style>

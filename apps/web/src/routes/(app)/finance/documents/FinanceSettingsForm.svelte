<script lang="ts">
	import type { FinanceSettings } from './+page.server';

	type Props = {
		settings: FinanceSettings;
	};

	let { settings }: Props = $props();

	const handoffLabels = {
		review_first: 'Verificare internă înainte de Keez',
		direct_to_keez: 'Trimitere directă către Keez'
	};
</script>

<form class="panel settings-panel" method="POST" action="?/updateSettings">
	<div>
		<p class="panel-title">Keez</p>
		<p class="panel-subtitle">
			{settings.keezConfigured ? 'Configurat' : 'Neconfigurat'} ·
			{settings.keezEnvironment}
		</p>
	</div>

	<label>
		<span>Flux documente</span>
		<select name="keezHandoffMode">
			<option value="review_first" selected={settings.keezHandoffMode === 'review_first'}>
				{handoffLabels.review_first}
			</option>
			<option
				value="direct_to_keez"
				selected={settings.keezHandoffMode === 'direct_to_keez'}
				disabled={!settings.keezDocumentUploadAvailable}
			>
				{handoffLabels.direct_to_keez}
			</option>
		</select>
	</label>

	{#if !settings.keezDocumentUploadAvailable}
		<p class="notice">API-ul Keez pentru încărcare documente nu este confirmat încă.</p>
	{/if}

	<button type="submit">Salvează setarea</button>
</form>

<style>
	.panel {
		display: grid;
		align-content: start;
		gap: 14px;
		border: 1px solid #d8dee6;
		border-radius: 8px;
		background: #ffffff;
		padding: 18px;
	}

	.panel-title,
	p {
		margin: 0;
	}

	.panel-title {
		font-size: 1rem;
		font-weight: 900;
	}

	.panel-subtitle,
	.notice {
		color: #52616f;
	}

	.panel-subtitle {
		margin-top: 4px;
		font-size: 0.92rem;
	}

	label {
		display: grid;
		gap: 6px;
		font-weight: 800;
	}

	select {
		width: 100%;
		min-width: 0;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: #ffffff;
		padding: 10px 12px;
		color: #17202a;
	}

	.notice {
		border-left: 3px solid #d97706;
		background: #fffbeb;
		padding: 10px 12px;
		font-weight: 750;
	}

	button {
		min-height: 38px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 0;
		border-radius: 8px;
		background: #c81e1e;
		padding: 0 14px;
		color: #ffffff;
		font-weight: 900;
		cursor: pointer;
	}

	button:hover {
		background: #991b1b;
	}

	@media (max-width: 620px) {
		button {
			width: 100%;
		}
	}
</style>

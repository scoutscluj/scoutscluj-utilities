<script lang="ts">
	import ConsentPdfViewer from './ConsentPdfViewer.svelte';
	import { onDestroy } from 'svelte';
	import { resolve } from '$app/paths';
	import type { RegistrationSettings } from './registration';
	let {
		activityId,
		settings,
		activity,
		units,
		saved = false
	}: {
		activityId: number;
		settings: RegistrationSettings;
		activity?: { title?: string; location?: string; startDate?: string; endDate?: string };
		units: { id: string; name: string; branch?: string; displayName: string }[];
		saved?: boolean;
	} = $props();
	let selected = $state(''),
		url = $state(''),
		message = $state(''),
		busy = $state(false);
	const unit = $derived(units.find((u) => u.id === selected) ?? units[0]);
	const body = $derived(
		JSON.stringify(
			activityId ? settings : { ...activity, settings, branch: unit?.branch, unitId: unit?.id }
		)
	);
	let running = false,
		disposed = false,
		pending: { body: string; endpoint: string } | undefined;
	async function refresh(body: string, endpoint: string) {
		if (running) {
			pending = { body, endpoint };
			return;
		}
		running = true;
		busy = true;
		message = '';
		try {
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body
			});
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message ?? 'Previzualizarea nu este disponibilă momentan.');
			}
			const blob = await response.blob();
			if (!disposed && !pending) {
				if (url) URL.revokeObjectURL(url);
				url = URL.createObjectURL(blob);
			}
		} catch (error) {
			if (!disposed && !pending) message = (error as Error).message;
		} finally {
			running = false;
			if (!disposed) {
				busy = false;
				if (pending) {
					const next = pending;
					pending = undefined;
					void refresh(next.body, next.endpoint);
				}
			}
		}
	}
	$effect(() => {
		const serialized = body;
		if (!unit?.branch || !settings.consent) return;
		const endpoint = activityId
			? `/activitati/${activityId}/api/consent-preview/${unit.branch}?unitId=${encodeURIComponent(unit.id)}`
			: '/activities/new/consent-preview';
		const timer = setTimeout(() => void refresh(serialized, endpoint), 1500);
		return () => clearTimeout(timer);
	});
	onDestroy(() => {
		disposed = true;
		pending = undefined;
		if (url) URL.revokeObjectURL(url);
	});
</script>

<aside aria-label="Previzualizarea acordului">
	<div class="heading">
		<strong>Acord de participare · previzualizare</strong><span aria-live="polite"
			>{busy ? 'Se actualizează PDF-ul…' : 'Fără date de participant'}</span
		>
	</div>
	{#if units.length > 1}<label
			>Verifică acordul pentru unitatea<select
				value={unit?.id ?? ''}
				onchange={(event) => (selected = event.currentTarget.value)}
				>{#each units as item (item.id)}<option value={item.id}>{item.displayName}</option
					>{/each}</select
			></label
		>{:else if unit}<p>{unit.displayName}</p>{/if}
	{#if message}<p role="status" class="error">
			{message} Modificările din formular sunt păstrate.
		</p>{/if}
	{#if url}{#key url}<ConsentPdfViewer {url} />{/key}{:else}<div class="empty">
			{units.length
				? 'Previzualizarea PDF apare după completarea informațiilor.'
				: 'Alege unitățile eligibile în setările înscrierilor.'}
		</div>{/if}
	<p class="hint">
		Previzualizarea include textele introduse acum. Documentele emise se modifică numai printr-o
		actualizare explicită.
	</p>
	{#if saved && unit}<a
			class="download"
			href={resolve(
				`/activitati/${activityId}/api/consent-preview/${unit.branch ?? 'temerari'}?unitId=${encodeURIComponent(unit.id)}`
			)}>↓ Descarcă acord de verificare fără date de participant</a
		><small>Descarcă informațiile salvate.</small>{/if}
</aside>

<style>
	aside {
		position: sticky;
		top: 80px;
		align-self: start;
		display: grid;
		gap: 12px;
		min-width: 0;
		background: var(--sc-canvas);
		padding: 16px;
		border: 1px solid var(--sc-border);
		border-radius: 10px;
	}
	.heading {
		display: grid;
		gap: 4px;
	}
	.heading span,
	small,
	.hint {
		font-size: 12px;
		color: var(--sc-muted);
	}
	p {
		margin: 0;
		line-height: 1.5;
	}
	label {
		display: grid;
		gap: 6px;
		font-size: 13px;
	}
	select {
		padding: 8px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-ink);
	}
	.empty {
		padding: 40px 16px;
		text-align: center;
		color: var(--sc-muted);
	}
	.download {
		padding: 10px 12px;
		border-radius: 7px;
		border: 1px solid var(--sc-accent);
		color: var(--sc-accent);
		font-weight: 600;
		text-decoration: none;
		line-height: 1.5;
	}
	.error {
		color: var(--sc-accent);
	}
	@media (max-width: 1000px) {
		aside {
			position: static;
		}
	}
</style>

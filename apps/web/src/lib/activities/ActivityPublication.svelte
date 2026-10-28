<script lang="ts">
	import { getContext } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Globe from '@lucide/svelte/icons/globe';
	import { registrationRequest, type Publication } from './registration';
	import { activityEditContext, type ActivityEditState } from './activity-edit-state';
	let { activityId, publication }: { activityId: number; publication: Publication } = $props();
	const editing = getContext<ActivityEditState>(activityEditContext);
	let busy = $state(false),
		message = $state('');
	const ended = $derived(['ended', 'cancelled'].includes(publication.state));
	async function toggle() {
		busy = true;
		message = '';
		try {
			const saved = await registrationRequest<{ revision: number }>(activityId, 'publication', {
				revision: publication.revision,
				published: !publication.public
			});
			if (editing) editing.publicationRevision = saved.revision;
			await invalidateAll();
			message = publication.public
				? 'Activitatea este publică. Poți distribui linkul.'
				: 'Pagina publică a fost retrasă.';
		} catch (error) {
			message = (error as Error).message;
		} finally {
			busy = false;
		}
	}
</script>

<section class="publication" aria-label="Publicarea activității">
	<div class="summary">
		<Globe size={20} />
		<div>
			<strong
				>{publication.public
					? 'Activitate publică'
					: ended
						? 'Activitate încheiată / anulată'
						: 'Activitate în pregătire'}</strong
			>
			<p>
				{ended
					? 'Pagina publică este indisponibilă. Înscrierile și plățile rămân în administrare.'
					: editing?.dirty
						? 'Salvează modificările înainte de publicare.'
						: 'Pagina se retrage automat după ultima zi a activității.'}
			</p>
		</div>
	</div>
	<div class="actions">
		{#if publication.public}<a
				href={resolve(`/activitati/${activityId}`)}
				target="_blank"
				rel="noreferrer">Deschide pagina publică ↗</a
			>{/if}
		{#if !ended}<button
				type="button"
				class:secondary={publication.public}
				disabled={busy || editing?.dirty}
				onclick={toggle}
				>{busy
					? 'Se salvează…'
					: publication.public
						? 'Retrage pagina publică'
						: 'Publică activitatea'}</button
			>{/if}
	</div>
	{#if message}<p class="message" role="status">{message}</p>{/if}
</section>

<style>
	.publication {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 12px 20px;
		padding: 16px 20px;
		border: 1px solid var(--sc-border);
		border-radius: 10px;
		background: var(--sc-surface);
	}
	.summary {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
		flex: 1 1 280px;
	}
	.summary :global(svg) {
		flex-shrink: 0;
		color: var(--sc-accent);
	}
	strong {
		font-size: 15px;
		font-weight: 600;
	}
	p {
		margin: 4px 0 0;
		color: var(--sc-muted);
		font-size: 13px;
		line-height: 1.5;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}
	a {
		color: var(--sc-accent);
		font-size: 14px;
	}
	button {
		min-height: 40px;
		padding: 10px 16px;
		border: 1px solid var(--sc-accent);
		border-radius: 7px;
		background: var(--sc-accent);
		color: white;
		font: inherit;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
	}
	button:hover {
		background: var(--sc-accent-hover);
	}
	button.secondary {
		background: var(--sc-surface);
		border-color: var(--sc-border-strong);
		color: var(--sc-ink);
		font-weight: 500;
	}
	button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	button:focus-visible {
		outline: 2px solid var(--sc-accent);
		outline-offset: 2px;
	}
	.message {
		flex-basis: 100%;
	}
	@media (max-width: 600px) {
		.publication {
			padding: 16px;
		}
		.actions {
			width: 100%;
		}
		.actions button {
			width: 100%;
		}
	}
</style>

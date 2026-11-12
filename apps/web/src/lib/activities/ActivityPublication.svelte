<script lang="ts">
	import { getContext } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Globe from '@lucide/svelte/icons/globe';
	import ActionMenu from '$lib/components/ui/ActionMenu.svelte';
	import FormFeedback from '$lib/components/ui/FormFeedback.svelte';
	import { focusSettingIssue } from './setting-issues';
	import {
		registrationRequest,
		RegistrationError,
		type RegistrationIssue,
		type Publication
	} from './registration';
	import { activityEditContext, type ActivityEditState } from './activity-edit-state';
	let {
		activityId,
		publication,
		compact = false
	}: { activityId: number; publication: Publication; compact?: boolean } = $props();
	const editing = getContext<ActivityEditState>(activityEditContext);
	let failed = $state(false),
		issues = $state<RegistrationIssue[]>([]);
	let busy = $state(false),
		message = $state('');
	const ended = $derived(['ended', 'cancelled'].includes(publication.state));
	async function copyLink() {
		failed = false;
		try {
			await navigator.clipboard.writeText(
				`${location.origin}${resolve(`/activitati/${activityId}`)}`
			);
			message = 'Linkul public al activității a fost copiat.';
		} catch {
			message = `Link public: ${location.origin}${resolve(`/activitati/${activityId}`)}`;
		}
	}
	async function toggle() {
		busy = true;
		message = '';
		failed = false;
		issues = [];
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
			failed = true;
			issues = error instanceof RegistrationError ? error.issues : [];
			message = (error as Error).message;
		} finally {
			busy = false;
		}
	}
</script>

<section class="publication" class:compact aria-label="Publicarea activității">
	<div class="publication-state">
		<Globe size={16} aria-hidden="true" />
		{#if publication.public}<a
				href={resolve(`/activitati/${activityId}`)}
				target="_blank"
				rel="noreferrer"
				aria-label="Deschide pagina publică">Activitate publică <span aria-hidden="true">↗</span></a
			>
		{:else}<strong>{ended ? 'Activitate încheiată / anulată' : 'Activitate în pregătire'}</strong
			>{/if}
	</div>
	{#if publication.public || !ended}<ActionMenu
			label="Acțiuni de publicare"
			items={[
				...(publication.public
					? [
							{
								label: 'Copiază linkul',
								action: () => {
									void copyLink();
								}
							}
						]
					: []),
				...(!ended
					? [
							{
								label: publication.public ? 'Retrage pagina publică' : 'Publică activitatea',
								action: () => {
									void toggle();
								},
								disabled: busy || !!editing?.dirty
							}
						]
					: [])
			]}
		/>{/if}
	{#if editing?.dirty}<p class="publication-note">
			Salvează modificările înainte de publicare.
		</p>{/if}
	{#if message}<div class="message">
			<FormFeedback
				{message}
				kind={failed ? 'error' : 'success'}
				{issues}
				onField={(field) => void focusSettingIssue(activityId, field)}
			/>
		</div>{/if}
</section>

<style>
	.publication {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 4px 12px;
		min-height: 44px;
		padding: 0 4px 0 0;
		border-bottom: 1px solid var(--sc-border);
	}
	.publication-state {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		font-size: 13px;
		color: var(--sc-muted);
	}
	.publication-state :global(svg) {
		flex-shrink: 0;
	}
	.publication-state a {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 44px;
		color: var(--sc-ink);
		text-decoration: none;
		font-weight: 500;
	}
	.publication-state a:hover {
		color: var(--sc-link);
	}
	.publication-state a:focus-visible {
		outline: 2px solid var(--sc-accent);
		outline-offset: 3px;
		border-radius: 4px;
	}
	strong {
		font-size: 13px;
		font-weight: 500;
	}
	.publication-note {
		flex-basis: 100%;
		margin: 0 0 8px;
		color: var(--sc-warning);
		font-size: 12px;
		line-height: 1.5;
	}
	.message {
		flex-basis: 100%;
		padding-bottom: 8px;
	}
	.compact {
		margin-bottom: 0;
	}
</style>

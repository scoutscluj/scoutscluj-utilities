<script lang="ts">
	import { onMount } from 'svelte';
	import { Dialog } from 'bits-ui';
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import Plus from '@lucide/svelte/icons/plus';
	import Target from '@lucide/svelte/icons/target';
	import X from '@lucide/svelte/icons/x';
	import { toast } from 'svelte-sonner';
	import { formatDeadline, localDate, type PersonalObjective } from './types';
	let { objectives, error }: { objectives: PersonalObjective[]; error: string } = $props();
	let open = $state(false);
	let busy = $state(false);
	let retrying = $state(false);
	let message = $state('');
	let title = $state('');
	let description = $state('');
	let deadline = $state('');
	let today = $state('');
	onMount(() => {
		const updateDate = () => {
			today = localDate(new Date());
		};
		updateDate();
		const timer = setInterval(updateDate, 60_000);
		return () => clearInterval(timer);
	});
	const retry = async () => {
		retrying = true;
		try {
			await invalidate('app:personal-objectives');
		} catch {
			toast.error('Lista nu a putut fi reîncărcată. Verifică conexiunea și încearcă din nou.');
		} finally {
			retrying = false;
		}
	};
</script>

<section class="objectives" aria-labelledby="objectives-title">
	<Dialog.Root
		bind:open
		onOpenChange={() => {
			message = '';
		}}
	>
		<header class="section-heading">
			<div>
				<h2 id="objectives-title">Obiective personale</h2>
				<p>Ce îți propui să realizezi, în ritmul tău.</p>
			</div>
			<Dialog.Trigger class="objective-trigger"
				><Plus size={17} aria-hidden="true" />Adaugă obiectiv</Dialog.Trigger
			>
		</header>
		{#if error}
			<div class="empty">
				<p role="alert">{error}</p>
				<button type="button" onclick={retry} disabled={retrying}
					>{retrying ? 'Se încarcă…' : 'Reîncearcă'}</button
				>
			</div>
		{:else if objectives.length === 0}
			<div class="empty">
				<Target size={28} aria-hidden="true" />
				<p>Nu ai adăugat încă niciun obiectiv personal.</p>
				<span>Adaugă primul obiectiv și alege un termen pentru el.</span>
			</div>
		{:else}
			<ul>
				{#each objectives as objective (objective.id)}
					<li>
						<div class="objective-heading">
							<h3>{objective.title}</h3>
							<time datetime={objective.deadline}>{formatDeadline(objective.deadline)}</time>
						</div>
						<p class="description">{objective.description}</p>
						{#if today && objective.deadline < today}<span class="overdue">Termen depășit</span
							>{/if}
					</li>
				{/each}
			</ul>
		{/if}
		<Dialog.Portal>
			<Dialog.Overlay class="sc-dialog-overlay" />
			<Dialog.Content
				class="sc-dialog-content"
				onEscapeKeydown={(event) => {
					if (busy) event.preventDefault();
				}}
				onInteractOutside={(event) => {
					if (busy) event.preventDefault();
				}}
			>
				<header class="sc-dialog-heading">
					<div>
						<Dialog.Title class="sc-dialog-title">Adaugă un obiectiv personal</Dialog.Title
						><Dialog.Description class="sc-dialog-description"
							>Alege ce vrei să realizezi și până când. Obiectivul este vizibil doar pentru tine.</Dialog.Description
						>
					</div>
					<Dialog.Close class="sc-icon-button" disabled={busy} aria-label="Închide dialogul"
						><X size={18} /></Dialog.Close
					>
				</header>
				<div class="sc-dialog-body">
					<form
						method="POST"
						action="?/createObjective"
						aria-busy={busy}
						use:enhance={({ cancel }) => {
							if (busy) {
								cancel();
								return;
							}
							message = '';
							if (!title.trim() || !description.trim()) {
								message = 'Completează titlul și descrierea.';
								cancel();
								return;
							}
							busy = true;
							return async ({ result }) => {
								try {
									if (result.type === 'success') {
										open = false;
										title = '';
										description = '';
										deadline = '';
										toast.success('Obiectivul a fost adăugat.');
										try {
											await invalidate('app:personal-objectives');
										} catch {
											toast.error(
												'Obiectivul a fost salvat. Reîncarcă pagina pentru a actualiza lista.'
											);
										}
									} else {
										message =
											result.type === 'failure'
												? String(result.data?.message ?? 'Obiectivul nu a putut fi salvat.')
												: 'Obiectivul nu a putut fi salvat. Încearcă din nou.';
									}
								} finally {
									busy = false;
								}
							};
						}}
					>
						<label for="objective-title"
							>Titlu<input
								id="objective-title"
								name="title"
								bind:value={title}
								maxlength="200"
								required
								disabled={busy}
								placeholder="De exemplu, organizez o drumeție"
							/></label
						>
						<label for="objective-description"
							>Descriere<textarea
								id="objective-description"
								name="description"
								bind:value={description}
								maxlength="5000"
								required
								rows="5"
								disabled={busy}
								placeholder="Descrie ce îți propui să faci."
							></textarea></label
						>
						<label for="objective-deadline"
							>Termen limită<input
								id="objective-deadline"
								type="date"
								name="deadline"
								min="0001-01-01"
								max="9999-12-31"
								bind:value={deadline}
								required
								disabled={busy}
							/></label
						>
						{#if message}<p class="form-error" role="alert">{message}</p>{/if}
						<div class="dialog-actions">
							<Dialog.Close type="button" disabled={busy}>Anulează</Dialog.Close><button
								type="submit"
								disabled={busy}>{busy ? 'Se salvează…' : 'Salvează obiectiv'}</button
							>
						</div>
					</form>
				</div>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>
</section>

<style>
	.objectives {
		margin-top: 24px;
		border: 1px solid var(--sc-border);
		border-radius: var(--sc-radius);
		background: var(--sc-surface);
	}
	.section-heading {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		padding: 20px;
		border-bottom: 1px solid var(--sc-border);
	}
	h2 {
		margin: 0;
		font-size: 20px;
		font-weight: 600;
	}
	.section-heading p {
		margin: 6px 0 0;
		color: var(--sc-muted);
		font-size: 14px;
	}
	:global(.objective-trigger) {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 38px;
		padding: 8px 14px;
		background: var(--sc-accent);
		border: 1px solid var(--sc-accent);
		border-radius: 7px;
		color: white;
		font: inherit;
		font-size: 14px;
		cursor: pointer;
	}
	:global(.objective-trigger:hover) {
		background: var(--sc-accent-hover);
	}
	.empty {
		display: grid;
		justify-items: center;
		gap: 12px;
		text-align: center;
		padding: 36px 20px;
		color: var(--sc-muted);
		font-size: 14px;
	}
	.empty p {
		margin: 0;
		color: var(--sc-ink);
	}
	.empty span {
		font-size: 13px;
	}
	.empty button {
		padding: 8px 14px;
		border: 1px solid var(--sc-border-strong);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		cursor: pointer;
	}
	ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	li {
		padding: 20px;
		overflow-wrap: anywhere;
	}
	li + li {
		border-top: 1px solid var(--sc-border);
	}
	.objective-heading {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 16px;
	}
	h3 {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
	}
	time {
		flex-shrink: 0;
		color: var(--sc-muted);
		font-size: 13px;
	}
	.description {
		white-space: pre-wrap;
		color: var(--sc-muted);
		font-size: 14px;
		line-height: 1.6;
		margin: 10px 0 0;
	}
	.overdue {
		display: inline-block;
		margin-top: 12px;
		padding: 4px 8px;
		border-radius: 5px;
		color: #991b1b;
		background: var(--sc-accent-soft);
		font-size: 12px;
	}
	.dialog-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 10px;
	}
	.form-error {
		margin: 0;
		color: #991b1b;
		font-size: 14px;
	}
	form :disabled {
		opacity: 0.6;
		cursor: wait;
	}
	@media (max-width: 600px) {
		.objective-heading {
			flex-direction: column;
			gap: 8px;
		}
	}
</style>

<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import {
		notificationApiFetch,
		readApiMessage,
		type BroadcastSummary,
		type NotificationDeliverySummary
	} from '$lib/notifications/notifications';

	let summary = $state<BroadcastSummary>({ users: 0, devices: 0 });
	let title = $state('');
	let body = $state('');
	let routePath = $state('');
	let loadingSummary = $state(true);
	let sending = $state(false);
	let result = $state<NotificationDeliverySummary | null>(null);

	const loadSummary = async () => {
		loadingSummary = true;
		try {
			const response = await notificationApiFetch('/api/notifications/broadcast/summary');
			if (!response.ok) {
				throw new Error(await readApiMessage(response));
			}

			summary = (await response.json()) as BroadcastSummary;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Nu s-au putut încărca abonamentele.');
		} finally {
			loadingSummary = false;
		}
	};

	const sendBroadcast = async () => {
		const trimmedTitle = title.trim();
		const trimmedBody = body.trim();
		const trimmedRoutePath = routePath.trim();

		if (!trimmedTitle || !trimmedBody) {
			toast.error('Titlul și mesajul sunt obligatorii.');
			return;
		}

		if (
			trimmedRoutePath &&
			(!trimmedRoutePath.startsWith('/') ||
				trimmedRoutePath.startsWith('//') ||
				trimmedRoutePath.includes('://'))
		) {
			toast.error('Ruta trebuie să fie o cale internă, de exemplu /profile.');
			return;
		}

		sending = true;
		result = null;
		try {
			const response = await notificationApiFetch('/api/notifications/broadcast', {
				method: 'POST',
				body: JSON.stringify({
					title: trimmedTitle,
					body: trimmedBody,
					routePath: trimmedRoutePath || undefined
				})
			});

			if (!response.ok) {
				throw new Error(await readApiMessage(response));
			}

			result = (await response.json()) as NotificationDeliverySummary;
			title = '';
			body = '';
			routePath = '';
			toast.success('Broadcast-ul a fost procesat.');
			await loadSummary();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Nu s-a putut trimite notificarea.');
		} finally {
			sending = false;
		}
	};

	onMount(() => {
		void loadSummary();
	});
</script>

<svelte:head>
	<title>Notificări | Scouts Cluj Utilities</title>
</svelte:head>

<section class="notifications-admin">
	<div class="page-heading">
		<div>
			<p class="eyebrow">Admin</p>
			<h1>Notificări</h1>
			<p>Trimite broadcast-uri către utilizatorii care au activat notificările.</p>
		</div>
		<button type="button" class="secondary-button" onclick={loadSummary} disabled={loadingSummary}>
			Actualizează
		</button>
	</div>

	<div class="summary-grid" aria-label="Abonamente active">
		<div>
			<span>Utilizatori abonați</span>
			<strong>{loadingSummary ? '...' : summary.users}</strong>
		</div>
		<div>
			<span>Dispozitive active</span>
			<strong>{loadingSummary ? '...' : summary.devices}</strong>
		</div>
	</div>

	<form class="broadcast-form" onsubmit={(event) => (event.preventDefault(), sendBroadcast())}>
		<label>
			<span>Titlu</span>
			<input bind:value={title} maxlength="100" placeholder="Titlul notificării" required />
		</label>

		<label>
			<span>Mesaj</span>
			<textarea
				bind:value={body}
				maxlength="500"
				rows="5"
				placeholder="Mesajul notificării"
				required
			></textarea>
		</label>

		<label>
			<span>Rută internă opțională</span>
			<input bind:value={routePath} placeholder="/profile" />
		</label>

		<div class="form-footer">
			<p>Notificarea ajunge la toate dispozitivele active. Nu include date personale în mesaj.</p>
			<button type="submit" disabled={sending || !title.trim() || !body.trim()}>
				{sending ? 'Se trimite...' : 'Trimite broadcast'}
			</button>
		</div>
	</form>

	{#if result}
		<div class="result-panel" aria-live="polite">
			<h2>Rezultat trimitere</h2>
			<dl>
				<div>
					<dt>Dispozitive</dt>
					<dd>{result.totalDevices}</dd>
				</div>
				<div>
					<dt>Trimise</dt>
					<dd>{result.successCount}</dd>
				</div>
				<div>
					<dt>Eșuate</dt>
					<dd>{result.failureCount}</dd>
				</div>
			</dl>
		</div>
	{/if}
</section>

<style>
	.notifications-admin {
		display: grid;
		gap: 18px;
		max-width: 880px;
	}

	.page-heading {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
	}

	.eyebrow,
	h1,
	h2,
	p {
		margin: 0;
	}

	.eyebrow {
		color: #64748b;
		font-size: 0.78rem;
		font-weight: 900;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	h1 {
		margin-top: 6px;
		font-size: 2rem;
	}

	.page-heading p,
	.form-footer p {
		color: #52616f;
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}

	.summary-grid div,
	.broadcast-form,
	.result-panel {
		border: 1px solid #d8dee6;
		border-radius: 8px;
		background: #ffffff;
	}

	.summary-grid div {
		display: grid;
		gap: 8px;
		padding: 16px;
	}

	.summary-grid span {
		color: #64748b;
		font-weight: 800;
	}

	.summary-grid strong {
		font-size: 2rem;
	}

	.broadcast-form {
		display: grid;
		gap: 16px;
		padding: 18px;
	}

	label {
		display: grid;
		gap: 8px;
		color: #334155;
		font-weight: 850;
	}

	input,
	textarea {
		width: 100%;
		box-sizing: border-box;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 10px 12px;
		font: inherit;
	}

	textarea {
		resize: vertical;
	}

	.form-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	button,
	.secondary-button {
		min-height: 40px;
		border: 1px solid #c81e1e;
		border-radius: 8px;
		background: #c81e1e;
		padding: 0 14px;
		color: #ffffff;
		font-weight: 900;
		cursor: pointer;
	}

	.secondary-button {
		border-color: #cbd5e1;
		background: #ffffff;
		color: #334155;
	}

	button:disabled {
		opacity: 0.58;
		cursor: not-allowed;
	}

	.result-panel {
		padding: 18px;
	}

	.result-panel dl {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
		margin: 14px 0 0;
	}

	.result-panel div {
		border-top: 1px solid #edf1f5;
		padding-top: 10px;
	}

	dt {
		color: #64748b;
		font-weight: 800;
	}

	dd {
		margin: 4px 0 0;
		font-size: 1.4rem;
		font-weight: 900;
	}

	@media (max-width: 720px) {
		.page-heading,
		.form-footer {
			align-items: stretch;
			flex-direction: column;
		}

		.summary-grid,
		.result-panel dl {
			grid-template-columns: 1fr;
		}
	}
</style>

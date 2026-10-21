<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { untrack } from 'svelte';
	import { deserialize, enhance } from '$app/forms';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import X from '@lucide/svelte/icons/x';
	import { money, type Obligation, type ObligationReview } from './types';
	import { feePlans } from './admin-ledger';
	let { obligation, open = $bindable(false) }: { obligation?: Obligation; open?: boolean } =
		$props();
	let preview = $state<ObligationReview>();
	let loading = $state(false);
	let saving = $state(false);
	let errorMessage = $state('');
	let note = $state('');
	let previewRequest = 0;
	const planLabel = (plan: string | null) =>
		feePlans.find((item) => item[0] === plan)?.[1] ?? plan ?? 'Indisponibil';
	const stateLabels = { paid: 'Plătit', partial: 'Parțial', unpaid: 'Neplătit' };
	const destinations = {
		orgo: {
			href: resolve('/admin/finance/membership-settings'),
			label: 'Setări și sincronizare ORGO'
		},
		payments: { href: resolve('/admin/finance/payments'), label: 'Plăți în curs' },
		receipts: { href: resolve('/admin/finance/receipts'), label: 'Încasări și alocări' },
		transfers: { href: resolve('/admin/finance/transfers'), label: 'Transferuri naționale' }
	};
	async function loadPreview(id: string, signal?: AbortSignal) {
		const requestId = ++previewRequest;
		loading = true;
		preview = undefined;
		errorMessage = '';
		try {
			const body = new FormData();
			body.set('action', 'reviewPreview');
			body.set('id', id);
			const response = await fetch(page.url.pathname, {
				method: 'POST',
				body,
				signal,
				headers: { accept: 'application/json', 'x-sveltekit-action': 'true' }
			});
			const result = deserialize(await response.text());
			if (requestId !== previewRequest || signal?.aborted) return;
			if (result.type === 'success' && result.data?.reviewPreview) {
				preview = result.data.reviewPreview as ObligationReview;
			} else {
				errorMessage =
					result.type === 'failure'
						? String(result.data?.message ?? 'Verificarea nu a putut fi încărcată.')
						: 'Verificarea nu a putut fi încărcată. Reîncearcă.';
			}
		} catch {
			if (requestId === previewRequest && !signal?.aborted)
				errorMessage = 'Verificarea nu a putut fi încărcată. Reîncearcă.';
		} finally {
			if (requestId === previewRequest && !signal?.aborted) loading = false;
		}
	}
	$effect(() => {
		if (!open || !obligation) return;
		const id = obligation.id;
		const controller = new AbortController();
		untrack(() => {
			note = '';
			if (obligation?.reviewState) void loadPreview(id, controller.signal);
			else {
				preview = undefined;
				errorMessage = '';
				loading = false;
			}
		});
		return () => {
			previewRequest++;
			controller.abort();
		};
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="review-overlay" />
		<Dialog.Content
			class="review-dialog"
			onEscapeKeydown={(event) => {
				if (saving) event.preventDefault();
			}}
			onInteractOutside={(event) => {
				if (saving) event.preventDefault();
			}}
		>
			<div class="heading">
				<Dialog.Title class="review-title">Rezolvă verificarea</Dialog.Title>
				<Dialog.Close disabled={saving} aria-label="Închide"><X size={20} /></Dialog.Close>
			</div>
			<Dialog.Description class="review-description"
				>Verifică motivul și valorile înainte de a confirma cotizația.</Dialog.Description
			>
			{#if obligation}
				<p><strong>{obligation.memberName}</strong> · ID ORGO {obligation.orgoUserId}</p>
				<p class="reason">
					{obligation.reviewReason ?? 'O plată a acestui membru necesită verificare financiară.'}
				</p>
				{#if !obligation.reviewState}
					<p>
						Verifică tranzacția în plățile în curs sau reconciliază încasarea. Starea cotizației se
						recalculează după rezolvarea plății.
					</p>
					<a href={destinations.payments.href}>Plăți în curs</a> ·
					<a href={destinations.receipts.href}>Încasări și alocări</a>
				{:else}
					{#if loading}<p role="status">Se verifică datele actuale din ORGO…</p>{/if}
					{#if preview}
						<p>Perioadă: <strong>{preview.periodName}</strong></p>
						<dl>
							<div>
								<dt>Plan în aplicație</dt>
								<dd>{planLabel(preview.currentPlan)}</dd>
							</div>
							<div>
								<dt>Plan actual în ORGO</dt>
								<dd>{planLabel(preview.orgoPlan)}</dd>
							</div>
							<div>
								<dt>Total actual</dt>
								<dd>{money(preview.currentTotalBani)}</dd>
							</div>
							<div>
								<dt>Total după confirmare</dt>
								<dd>
									{preview.proposedTotalBani === null
										? 'Indisponibil'
										: money(preview.proposedTotalBani)}
								</dd>
							</div>
							<div>
								<dt>Național: actual → nou</dt>
								<dd>
									{money(preview.currentNationalBani)} → {preview.proposedNationalBani === null
										? 'Indisponibil'
										: money(preview.proposedNationalBani)}
								</dd>
							</div>
							<div>
								<dt>Încasat și alocat</dt>
								<dd>{money(preview.paidBani)}</dd>
							</div>
							<div>
								<dt>Rest de plată după confirmare</dt>
								<dd>
									{preview.remainingBani === null ? 'Indisponibil' : money(preview.remainingBani)}
								</dd>
							</div>
						</dl>
						{#each preview.blockers as blocker (blocker.message)}
							<p class="reason">
								{blocker.message}
								<a href={destinations[blocker.target].href}>{destinations[blocker.target].label}</a>
							</p>
						{/each}
						{#if preview.canResolve}
							{#if preview.resumesNationalReview}<p>
									Transferul național existent se păstrează. După confirmare, aplicația reia
									verificarea lui în ORGO.
								</p>{/if}
							<p>
								După confirmare: <strong>{stateLabels[preview.resultingState]}</strong>. Încasările
								și alocările existente se păstrează.
							</p>
							<form
								method="POST"
								use:enhance={() => {
									saving = true;
									errorMessage = '';
									return async ({ result, update }) => {
										try {
											if (result.type === 'success') {
												await update();
												open = false;
											} else {
												preview = undefined;
												errorMessage =
													result.type === 'failure'
														? String(result.data?.message ?? 'Confirmarea a eșuat.')
														: 'Rezultatul confirmării este necunoscut. Reîncarcă verificarea înainte de a reîncerca.';
											}
										} finally {
											saving = false;
										}
									};
								}}
							>
								<input type="hidden" name="action" value="resolveReview" />
								<input type="hidden" name="id" value={obligation.id} />
								<input type="hidden" name="version" value={preview.version} />
								<label
									>Motivul confirmării<textarea
										name="note"
										bind:value={note}
										required
										maxlength="2000"
										disabled={saving}
										placeholder="Am verificat planul și suma încasată."
									></textarea></label
								>
								<button class="confirm" disabled={saving || !note.trim()}
									>{saving ? 'Se confirmă…' : 'Confirmă planul și recalculează'}</button
								>
							</form>
						{/if}
					{/if}
					{#if errorMessage}<p role="alert" class="error">{errorMessage}</p>{/if}
					<button
						type="button"
						disabled={loading || saving}
						onclick={() => {
							if (obligation) void loadPreview(obligation.id);
						}}>Reîncarcă verificarea</button
					>
				{/if}
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	:global(.review-overlay) {
		position: fixed;
		inset: 0;
		z-index: 60;
		background: #10281d66;
		backdrop-filter: blur(3px);
	}
	:global(.review-dialog) {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 61;
		width: min(600px, calc(100vw - 28px));
		max-height: calc(100dvh - 32px);
		overflow-y: auto;
		padding: 24px;
		border-radius: 20px;
		background: white;
		color: #1e293b;
		box-shadow: 0 24px 80px #0f172a40;
	}
	.heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	:global(.review-title) {
		margin: 0;
		font-size: 1.4rem;
	}
	:global(.review-description) {
		color: var(--sc-muted);
		line-height: 1.5;
	}
	p {
		line-height: 1.5;
		overflow-wrap: anywhere;
	}
	.reason {
		padding: 12px;
		border-radius: 10px;
		background: #fffbeb;
		color: #854d0e;
	}
	dl {
		padding: 16px;
		background: #f0fdf4;
		border-radius: 12px;
	}
	dl div {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		padding: 6px 0;
	}
	dt {
		color: #52665a;
	}
	dd {
		margin: 0;
		text-align: right;
		font-weight: 600;
	}
	a {
		color: #166534;
		text-decoration: underline;
	}
	label {
		display: grid;
		gap: 8px;
		margin: 16px 0;
	}
	textarea {
		width: 100%;
		min-height: 80px;
		border: 1px solid var(--sc-border-strong);
		border-radius: 10px;
		padding: 10px;
		font: inherit;
	}
	button,
	:global(.review-dialog button) {
		border: 1px solid var(--sc-border-strong);
		border-radius: 10px;
		padding: 10px 14px;
		background: white;
		color: var(--sc-ink);
		font: inherit;
		cursor: pointer;
	}
	.confirm {
		background: #166534;
		color: white;
		border-color: #166534;
		margin-bottom: 16px;
	}
	button:disabled {
		opacity: 0.6;
		cursor: wait;
	}
	.error {
		background: #fff1f2;
		color: #b42318;
		padding: 12px;
		border-radius: 10px;
	}
</style>

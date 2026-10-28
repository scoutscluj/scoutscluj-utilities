<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import FormFeedback from '$lib/components/ui/FormFeedback.svelte';
	import {
		registrationRequest,
		money,
		states,
		type Registration,
		type Overview
	} from './registration';
	let { data }: { data: { activity: { id: number; title: string }; overview: Overview } } =
		$props();
	let search = $state(''),
		pendingOnly = $state(true),
		branch = $state(''),
		busy = $state(''),
		message = $state(''),
		failed = $state(false);
	const normalize = (s: string) =>
		s
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase();
	const capability = $derived(data.overview.capabilities);
	const needsPaper = (r: Registration) =>
		r.minor &&
		r.role !== 'staff' &&
		!['paper_received', 'signed_accepted', 'not_required'].includes(r.consentState);
	const all = $derived(
		data.overview.rows.filter((r) => ['accepted', 'reserved'].includes(r.state))
	);
	const rows = $derived(
		all.filter(
			(r) =>
				(!branch || r.branch === branch) &&
				(!pendingOnly ||
					(capability.consent && needsPaper(r)) ||
					(capability.finance && (r.cashRemainingBani ?? 0) > 0)) &&
				normalize(search)
					.trim()
					.split(/\s+/)
					.every((word) => normalize(`${r.memberName} ${r.orgoId}`).includes(word))
		)
	);
	const branchNames: Record<string, string> = {
		lupisori: 'Lupișori',
		temerari: 'Temerari',
		exploratori: 'Exploratori',
		seniori: 'Seniori'
	};
	async function receive(row: Registration, paper: boolean, cashKeys: string[] = []) {
		if (busy) return;
		busy = row.id;
		message = '';
		failed = false;
		try {
			await registrationRequest(data.activity.id, `registrations/${row.id}/check-in`, {
				revision: row.revision,
				paper,
				cashKeys,
				cashBani: (row.cashInstallments ?? [])
					.filter((i) => cashKeys.includes(i.key))
					.reduce((sum, i) => sum + i.remainingBani, 0)
			});
			await invalidateAll();
			message = `${row.memberName}: ${paper ? 'acord fizic primit' : ''}${paper && cashKeys.length ? ' și ' : ''}${cashKeys.length ? 'numerar încasat' : ''}.`;
		} catch (error) {
			failed = true;
			message = (error as Error).message;
			await invalidateAll();
		} finally {
			busy = '';
		}
	}
</script>

<section class="handoff">
	<header>
		<div>
			<h1>Primire participanți</h1>
			<p>{data.activity.title} · {all.length} participanți cu loc</p>
		</div>
		<a href={resolve(`/activities/${data.activity.id}/registrations`)}>Toate înscrierile →</a>
	</header>
	<p>
		Confirmă numai ce ai primit efectiv. Încasarea se înregistrează cu suma afișată și data de
		astăzi. Corecțiile se fac din evidența plăților.
	</p>
	<div class="filters">
		<label
			>Caută nume sau ID<input
				type="search"
				bind:value={search}
				placeholder="Nume / ID Orgo"
			/></label
		>{#if new Set(all.map((r) => r.branch)).size > 1}<label
				>Ramură<select bind:value={branch}
					><option value="">Toate ramurile</option
					>{#each [...new Set(all.map((r) => r.branch))] as code (code)}<option value={code}
							>{branchNames[code] ?? code}</option
						>{/each}</select
				></label
			>{/if}<label class="choice"
			><input type="checkbox" bind:checked={pendingOnly} /> Doar cu documente sau cash de primit</label
		>
	</div>
	{#if message}<FormFeedback {message} kind={failed ? 'error' : 'success'} />{/if}
	<div class="participants" aria-busy={!!busy}>
		{#each rows as row (row.id)}
			{@const paper = capability.consent && !!needsPaper(row)}
			{@const cash = capability.finance
				? (row.cashInstallments ?? []).filter((i) => i.remainingBani > 0)
				: []}
			<article class:complete={!paper && !cash.length}>
				<div class="identity">
					<strong>{row.memberName}</strong><small
						>ID {row.orgoId} · {branchNames[row.branch] ?? row.branch}</small
					><span>{states[row.state]}</span>
				</div>
				<div class="document">
					<small>Acord de participare</small><strong
						>{states[row.consentState] ?? row.consentState}</strong
					>{#if paper && row.handoffPaperReady}<button
							disabled={!!busy}
							onclick={() => receive(row, true)}>Acord fizic primit</button
						>{:else if paper}<p>
							PDF-ul actual trebuie generat înainte de validarea acordului fizic.
						</p>{/if}{#if capability.consent && row.consentState === 'uploaded'}<a
							href={resolve(`/activities/${data.activity.id}/registrations`)}
							>Verifică documentul digital în înscrieri</a
						>{/if}
				</div>
				{#if capability.finance}<div class="cash">
						<small>Cash la predare</small><strong
							>{cash.length ? money(row.cashRemainingBani) : 'Nimic de încasat cash'}</strong
						>{#each cash as item, index (item.key)}<button
								disabled={!!busy}
								onclick={() => receive(row, false, [item.key])}
								>Cash {money(item.remainingBani)} primit{cash.length > 1
									? ` · tranșa ${index + 1}`
									: ''}</button
							>{/each}{#if (row.cardRemainingBani ?? 0) > 0}<p>
								Alte sume încă neachitate: {money(row.cardRemainingBani)}
							</p>{/if}
					</div>{/if}
				{#if paper && row.handoffPaperReady && cash.length}<button
						class="both"
						disabled={!!busy}
						onclick={() =>
							receive(
								row,
								true,
								cash.map((i) => i.key)
							)}>Confirmă acord + cash {money(row.cashRemainingBani)}</button
					>{/if}
				{#if busy === row.id}<span role="status">Se înregistrează…</span>{/if}
			</article>
		{:else}<p class="empty">Niciun participant pentru filtrele alese.</p>{/each}
	</div>
</section>

<style>
	.handoff {
		display: grid;
		gap: 16px;
	}
	header {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		align-items: center;
		flex-wrap: wrap;
	}
	h1,
	p {
		margin: 0;
	}
	h1 {
		font-size: 28px;
	}
	p,
	small {
		color: var(--sc-muted);
		line-height: 1.5;
	}
	header p {
		margin-top: 4px;
	}
	a {
		color: var(--sc-accent);
	}
	.filters {
		display: flex;
		gap: 16px;
		align-items: end;
		flex-wrap: wrap;
		padding: 16px;
		background: var(--sc-surface);
		border: 1px solid var(--sc-border);
		border-radius: 10px;
	}
	label {
		display: grid;
		gap: 6px;
		font-size: 13px;
	}
	input[type='search'],
	select {
		padding: 9px 12px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-ink);
	}
	.choice {
		display: flex;
		align-items: center;
		min-height: 38px;
	}
	.participants {
		display: grid;
		gap: 12px;
	}
	article {
		display: grid;
		grid-template-columns: minmax(180px, 1fr) minmax(180px, 1fr) minmax(180px, 1fr);
		gap: 16px;
		align-items: start;
		padding: 20px;
		border: 1px solid var(--sc-border);
		border-radius: 10px;
		background: var(--sc-surface);
	}
	article > div {
		display: grid;
		gap: 8px;
	}
	strong {
		font-size: 15px;
	}
	small {
		font-size: 12px;
	}
	.identity > strong {
		font-size: 17px;
	}
	.identity > span {
		font-size: 12px;
	}
	button {
		min-height: 44px;
		padding: 10px 14px;
		border: 1px solid var(--sc-accent);
		border-radius: 7px;
		color: var(--sc-accent);
		background: var(--sc-surface);
		font-weight: 600;
		cursor: pointer;
		text-align: left;
	}
	button:disabled {
		opacity: 0.55;
		cursor: wait;
	}
	.both {
		grid-column: 2/-1;
		background: var(--sc-accent);
		color: white;
	}
	.complete {
		border-left: 4px solid #27825a;
	}
	.empty {
		padding: 28px;
		text-align: center;
	}
	@media (max-width: 750px) {
		article {
			grid-template-columns: minmax(0, 1fr);
		}
		.both {
			grid-column: auto;
		}
		.filters > label:first-child {
			width: 100%;
		}
		input[type='search'] {
			width: 100%;
			box-sizing: border-box;
		}
	}
</style>

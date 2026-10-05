<script lang="ts">
	import MembershipAdminPage from '$lib/membership/MembershipAdminPage.svelte';
	import { money } from '$lib/membership/types';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { feePlans as plans } from '$lib/membership/admin-ledger';
	import FinanceStatus from '$lib/membership/FinanceStatus.svelte';
	import Users from '@lucide/svelte/icons/users';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import BadgeCheck from '@lucide/svelte/icons/badge-check';
	let { data, form } = $props();
	const ledger = $derived(data.ledger);
	let memberCard = $state('');
	const activePeriod = $derived(ledger.periods.find((period) => period.active));
	const currentObligations = $derived(
		activePeriod ? ledger.obligations.filter((item) => item.periodId === activePeriod.id) : []
	);
	let lastSyncSignature = $state('');
	let ready = $state(false);
	let syncing = $state(false);
	const syncToastId = 'orgo-roster-sync-progress';
	const syncRoster: SubmitFunction = () => {
		syncing = true;
		toast.loading('Sincronizare cu ORGO în curs…', {
			id: syncToastId,
			duration: Infinity,
			style: 'background: #eff6ff; color: #1d4ed8; border-color: #93c5fd;'
		});
		return async ({ result, update }) => {
			try {
				toast.dismiss(syncToastId);
				if (result.type === 'error') toast.error('Sincronizarea ORGO a eșuat. Încearcă din nou.');
				await update();
			} finally {
				syncing = false;
			}
		};
	};
	$effect(() => {
		const sync = ledger.rosterSync;
		const signature = sync ? sync.id + ':' + sync.status : '';
		if (ready && sync && signature && signature !== lastSyncSignature) {
			lastSyncSignature = signature;
			if (sync.status === 'succeeded') toast.success('Sincronizarea ORGO a fost finalizată.');
			else if (sync.status === 'failed') toast.error(sync.error ?? 'Sincronizarea ORGO a eșuat.');
		}
	});
	onMount(() => {
		lastSyncSignature = ledger.rosterSync
			? ledger.rosterSync.id + ':' + ledger.rosterSync.status
			: '';
		ready = true;
		let checks = 0;
		const timer = window.setInterval(async () => {
			checks++;
			await invalidateAll();
			if (checks >= 6) window.clearInterval(timer);
		}, 5000);
		return () => {
			window.clearInterval(timer);
			toast.dismiss(syncToastId);
		};
	});
</script>

<MembershipAdminPage
	title="Configurare cotizații"
	description="Pregătește perioadele, tarifele și sincronizarea membrilor cu ORGO."
	{form}
>
	<div class="setup-overview">
		<div>
			<span class="setup-icon"><CalendarDays size={22} /></span>
			<div>
				<small>Perioada activă</small><strong>{activePeriod?.name ?? 'Nedisponibilă'}</strong>
			</div>
		</div>
		<div>
			<span class="setup-icon"><Users size={22} /></span>
			<div><small>Membri înregistrați</small><strong>{currentObligations.length}</strong></div>
		</div>
		<div>
			<span class="setup-icon"><BadgeCheck size={22} /></span>
			<div>
				<small>Registrul ORGO</small><FinanceStatus
					state={ledger.rosterInitialized ? 'active' : 'pending'}
					label={ledger.rosterInitialized ? 'Inițializat' : 'De inițializat'}
				/>
			</div>
		</div>
	</div>
	<section class="sync-panel">
		<div class="panel-heading">
			<div>
				<h2>Ține registrul la zi</h2>
				<p>Importă și actualizează cotizațiile din ORGO pentru perioada curentă.</p>
			</div>
			<RefreshCw size={24} color="#15803d" />
		</div>
		{#if activePeriod}
			<p>
				Perioada activă: <strong>{activePeriod.name}</strong>. Sunt înregistrate
				<strong>{currentObligations.length}</strong> cotizații.
			</p>
			{#if ledger.rosterSync}
				<p class="sync-status">
					<FinanceStatus
						state={ledger.rosterSync.status === 'running' ? 'syncing' : ledger.rosterSync.status}
						label={ledger.rosterSync.status === 'running'
							? 'Sincronizare în curs'
							: ledger.rosterSync.status === 'succeeded'
								? 'Sincronizare finalizată'
								: 'Sincronizare nereușită'}
					/>
					<span class="muted"
						>{new Date(ledger.rosterSync.completedAt ?? ledger.rosterSync.createdAt).toLocaleString(
							'ro-RO',
							{ timeZone: 'Europe/Bucharest' }
						)}</span
					>
					{#if ledger.rosterSync.error}{ledger.rosterSync.error}{/if}
				</p>
			{/if}
			<div class="actions">
				{#if !ledger.rosterInitialized}
					<form method="POST" use:enhance>
						<input type="hidden" name="action" value="rosterPreview" />
						<button>Inițializează cotizațiile pentru {activePeriod.name}</button>
					</form>
				{:else}
					<form method="POST" use:enhance={syncRoster} aria-busy={syncing}>
						<input type="hidden" name="action" value="rosterSync" />
						<button disabled={syncing}>Sincronizează acum cu ORGO</button>
					</form>
				{/if}
			</div>
			{#if form?.preview}
				<div class="preview">
					<h3>Previzualizare înainte de inițializare</h3>
					<p>
						Vor fi adăugați <strong>{form.preview.newCount}</strong> membri. Există
						<strong>{form.preview.issues.length}</strong> cazuri care necesită verificare.
					</p>
					<div class="scroll">
						<table>
							<thead><tr><th>Membru</th><th>ID ORGO</th><th>Plan</th><th>Total</th></tr></thead>
							<tbody>
								{#each form.preview.members as member (member.orgoUserId)}
									<tr
										><td>{member.memberName}</td><td>{member.orgoUserId}</td><td>{member.plan}</td
										><td>{money(member.totalBani)}</td></tr
									>
								{/each}
							</tbody>
						</table>
					</div>
					{#if form.preview.issues.length > 0}
						<ul>
							{#each form.preview.issues as issue (issue.orgoUserId)}<li>
									{issue.memberName} ({issue.orgoUserId}): {issue.reason}
								</li>{/each}
						</ul>
					{/if}
					<form method="POST" use:enhance>
						<input type="hidden" name="action" value="rosterInitialize" />
						<button>Confirmă inițializarea</button>
					</form>
				</div>
			{/if}
		{:else}<p>Perioada curentă nu este disponibilă.</p>{/if}
	</section>

	{#if activePeriod}
		<section>
			<h2>Tarifele publicate pentru {activePeriod.name}</h2>
			<p>
				Același total pentru plata cu cardul și transferul bancar. Cotizațiile cu istoric de plată
				își păstrează suma deja stabilită.
			</p>
			<div class="price-plans">
				{#each Object.entries(activePeriod.prices) as [key, price] (key)}<div class="price-plan">
						<span>{price.label}</span><strong>{money(price.totalBani)}</strong><small
							>Bază {money(price.baseBani ?? price.totalBani)}</small
						><small>Parte națională {money(price.nationalBani)}</small>
					</div>{/each}
			</div>
		</section>
	{/if}
	<details>
		<summary>Perioade și tarife</summary>
		{#each ledger.periods as p (p.id)}<div class="row">
				<span>{p.name} · {p.startsOn} – {p.endsOn} {p.active ? '· Activă' : ''}</span>
			</div>{/each}
		<form method="POST" class="grid">
			<input type="hidden" name="action" value="period" />
			<label>Denumirea perioadei ORGO<input name="name" required maxlength="100" /></label><label
				>Început<input type="date" name="startsOn" required /></label
			><label>Sfârșit<input type="date" name="endsOn" required /></label>
			{#each plans as [key, label, total] (key)}<label
					>{label} — total RON<input
						name={key}
						type="number"
						min="0.01"
						step="0.01"
						value={total}
						required
					/></label
				>{/each}
			<p>
				Sumele introduse sunt baza cotizației. Sistemul adaugă acoperirea comisionului
				procesatorului activ și rotunjește în sus la un multiplu de 5 lei. Totalul publicat este
				același pentru card și bancă. Perioada corespunzătoare devine activă automat la 1
				septembrie. Dacă nu este pregătită în avans, sistemul o creează și copiază tarifele celei
				mai recente perioade.
			</p>
			<button>Creează perioada</button>
		</form>
	</details>

	<details>
		<summary>Adaugă o cotizație verificată</summary>
		<form method="POST" class="grid">
			<input type="hidden" name="action" value="obligation" />
			<label
				>Perioadă<select name="periodId" required
					>{#each ledger.periods as p (p.id)}<option value={p.id}>{p.name}</option>{/each}</select
				></label
			>
			<label
				>ID ORGO<input
					name="orgoUserId"
					inputmode="numeric"
					pattern="[1-9][0-9]*"
					required
				/></label
			>
			<label
				>ID Card (opțional)<input
					name="cardId"
					bind:value={memberCard}
					oninput={(e) => {
						e.currentTarget.value = e.currentTarget.value.toUpperCase();
						memberCard = e.currentTarget.value;
					}}
					autocapitalize="characters"
				/></label
			>
			<label>Nume membru<input name="memberName" required /></label>
			<label
				>Plan ORGO<select name="plan"
					>{#each plans as [key, label] (key)}<option value={key}>{label}</option>{/each}</select
				></label
			>
			<label
				>Dovada verificării în ORGO / apartenența la Cluj<textarea
					name="verificationNote"
					required
					maxlength="2000"
				></textarea></label
			><button>Înregistrează cotizația</button>
		</form>
	</details>
</MembershipAdminPage>

<style>
	.setup-overview {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 16px;
	}
	.setup-overview > div {
		display: flex;
		gap: 14px;
		align-items: center;
		padding: 20px;
		background: white;
		border: 1px solid #e1e8e4;
		border-radius: 14px;
	}
	.setup-overview strong {
		display: block;
		font-size: 1.2rem;
		margin-top: 4px;
	}
	.setup-overview small {
		margin: 0 0 6px;
	}
	.setup-icon {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 44px;
		height: 44px;
		border-radius: 12px;
		background: #f0fdf4;
		color: #15803d;
	}
	.sync-panel {
		background: linear-gradient(120deg, #f0fdf4, white) !important;
		border-color: #cee7d5 !important;
	}
	.sync-status {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}
	.price-plans {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
		gap: 14px;
		margin-top: 22px;
	}
	.price-plan {
		padding: 20px;
		background: #f8faf9;
		border: 1px solid #e1e8e4;
		border-radius: 12px;
	}
	.price-plan > span {
		font-size: 0.85rem;
		font-weight: 600;
		color: #475569;
	}
	.price-plan strong {
		display: block;
		font-size: 1.5rem;
		color: #166534;
		margin: 12px 0;
	}
	.preview {
		margin-top: 22px;
		padding-top: 20px;
		border-top: 1px solid #dce5df;
	}
	@media (max-width: 850px) {
		.setup-overview {
			grid-template-columns: 1fr;
		}
	}
</style>

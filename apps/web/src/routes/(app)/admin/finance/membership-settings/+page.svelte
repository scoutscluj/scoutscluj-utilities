<script lang="ts">
	import MembershipAdminPage from '$lib/membership/MembershipAdminPage.svelte';
	import { money } from '$lib/membership/types';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { feePlans as plans } from '$lib/membership/admin-ledger';
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
	<section>
		<h2>Inițializare și sincronizare ORGO</h2>
		{#if activePeriod}
			<p>
				Perioada activă: <strong>{activePeriod.name}</strong>. Sunt înregistrate
				<strong>{currentObligations.length}</strong> cotizații.
			</p>
			{#if ledger.rosterSync}
				<p class="sync-status">
					Ultima sincronizare: {ledger.rosterSync.status === 'running'
						? 'în curs'
						: ledger.rosterSync.status === 'succeeded'
							? 'finalizată'
							: 'nereușită'}.
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
			<div class="scroll">
				<table>
					<thead
						><tr><th>Plan</th><th>Bază</th><th>Total de plată</th><th>Parte națională</th></tr
						></thead
					><tbody>
						{#each Object.entries(activePeriod.prices) as [key, price] (key)}<tr
								><td>{price.label}</td><td>{money(price.baseBani ?? price.totalBani)}</td><td
									><strong>{money(price.totalBani)}</strong></td
								><td>{money(price.nationalBani)}</td></tr
							>{/each}
					</tbody>
				</table>
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

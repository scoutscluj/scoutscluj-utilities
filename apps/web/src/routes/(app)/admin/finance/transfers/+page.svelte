<script lang="ts">
	import MembershipAdminPage from '$lib/membership/MembershipAdminPage.svelte';
	import { money } from '$lib/membership/types';
	import MembershipRegistry from '$lib/membership/MembershipRegistry.svelte';
	import { resolve } from '$app/paths';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	let { data, form } = $props();
	const ledger = $derived(data.ledger);
	const labels: Record<string, string> = {
		queued: 'Programat',
		syncing: 'Sincronizare în curs',
		synced: 'Cotizație confirmată în ORGO',
		pending_approval: 'Așteaptă confirmarea ORGO',
		failed: 'Sincronizare nereușită',
		unknown: 'Rezultat de verificat',
		manually_confirmed: 'Verificat manual',
		correction_required: 'Corecție financiară necesară',
		awaiting_access: 'Transfer vechi · nesincronizat'
	};
	onMount(() => {
		const timer = window.setInterval(() => {
			if (
				ledger.nationalItems.some((item) =>
					['queued', 'syncing', 'pending_approval'].includes(item.orgoState)
				)
			)
				void invalidateAll();
		}, 15000);
		return () => window.clearInterval(timer);
	});
</script>

<MembershipAdminPage
	title="Transferuri naționale"
	description="Înregistrează transferul bancar și urmărește confirmarea cotizațiilor în ORGO."
	{form}
>
	<p>
		Transferul de bani se face din contul bancar al asociației. După înregistrarea sa aici, sistemul
		verifică și marchează automat perioada cotizației în ORGO, separat pentru fiecare membru. <a
			href={resolve('/admin/finance/guide#transferuri')}>Vezi pașii în ghid</a
		>.
	</p>
	{#if ledger.orgoIntegration !== 'configured'}<p class="notice">
			Tokenul tău ORGO nu este disponibil. Autentifică-te din nou. Transferurile se păstrează în
			Resurse, dar marcarea automată folosește tokenul utilizatorului care înregistrează transferul,
			cu permisiuni financiare naționale.
		</p>{/if}
	<MembershipRegistry {ledger} transfers />
	<section>
		<h2>Transferuri înregistrate și rezultatul ORGO</h2>
		{#if ledger.batches.length === 0}<p>Nu există încă transferuri înregistrate.</p>{/if}
		{#each ledger.batches as batch (batch.id)}
			<details
				open={ledger.nationalItems.some(
					(i) => i.batchId === batch.id && !['synced', 'manually_confirmed'].includes(i.orgoState)
				)}
			>
				<summary>{batch.transferredOn} · {batch.reference} · {money(batch.totalBani)}</summary>
				{#each ledger.nationalItems.filter((i) => i.batchId === batch.id) as item (item.id)}
					<div class="orgo-item">
						<strong
							>{ledger.obligations.find((o) => o.id === item.obligationId)?.memberName} · {money(
								item.amountBani
							)}</strong
						>
						<p class:confirmed={['synced', 'manually_confirmed'].includes(item.orgoState)}>
							{labels[item.orgoState] ?? item.orgoState}
						</p>
						{#if item.orgoError}<p class="notice">{item.orgoError}</p>{/if}
						{#if item.evidence}<p class="evidence">{item.evidence}</p>{/if}
						{#if ['failed', 'awaiting_access', 'unknown'].includes(item.orgoState)}
							<form method="POST">
								<input type="hidden" name="action" value="retryOrgo" /><input
									type="hidden"
									name="id"
									value={item.id}
								/><button
									>{item.orgoState === 'unknown'
										? 'Verifică rezultatul în ORGO'
										: 'Reîncearcă sincronizarea ORGO'}</button
								>
							</form>
						{/if}
						{#if item.orgoState === 'unknown'}
							<details>
								<summary>Am verificat că plata nu există în ORGO</summary>
								<p>
									Folosește această opțiune doar după verificarea exactă a membrului și perioadei în
									ORGO. Permite trimiterea unei cereri noi.
								</p>
								<form method="POST" class="grid">
									<input type="hidden" name="action" value="retryOrgo" /><input
										type="hidden"
										name="id"
										value={item.id}
									/><label
										><input type="checkbox" name="verifiedNotRecorded" required /> Confirm că plata nu
										este înregistrată în ORGO pentru această perioadă.</label
									><label>Dovada verificării<textarea name="evidence" required></textarea></label
									><button>Reîncearcă după verificare</button>
								</form>
							</details>
						{/if}
						{#if ['failed', 'unknown', 'awaiting_access', 'pending_approval'].includes(item.orgoState)}
							<details>
								<summary>Confirmare după rezolvare manuală în ORGO</summary>
								<p>
									Acest formular păstrează dovada verificării. Marcarea plății trebuie făcută și
									verificată mai întâi în ORGO.
								</p>
								<form method="POST" class="grid">
									<input type="hidden" name="action" value="confirm" /><input
										type="hidden"
										name="id"
										value={item.id}
									/><label
										>Dovada confirmării finale în ORGO<textarea name="evidence" required
										></textarea></label
									><button>Înregistrează verificarea manuală în ORGO</button>
								</form>
							</details>
						{/if}
					</div>
				{/each}
			</details>
		{/each}
	</section>
</MembershipAdminPage>

<style>
	.orgo-item {
		border-top: 1px solid #e2e8f0;
		padding: 16px 0;
	}
	.orgo-item p {
		margin: 8px 0;
	}
	.confirmed {
		color: #166534;
		font-weight: 700;
	}
	.evidence {
		color: #64748b;
		font-size: 0.85rem;
		overflow-wrap: anywhere;
	}
	.notice {
		padding: 12px;
		border-radius: 8px;
		background: #fffbeb;
		border: 1px solid #fde68a;
	}
</style>

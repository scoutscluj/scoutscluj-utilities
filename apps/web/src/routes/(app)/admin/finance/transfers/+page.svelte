<script lang="ts">
	import MembershipAdminPage from '$lib/membership/MembershipAdminPage.svelte';
	import { money } from '$lib/membership/types';
	import MembershipRegistry from '$lib/membership/MembershipRegistry.svelte';
	let { data, form } = $props();
	const ledger = $derived(data.ledger);
</script>

<MembershipAdminPage
	title="Transferuri naționale"
	description="Selectează cotizațiile achitate și înregistrează transferurile către organizația națională."
	{form}
>
	<MembershipRegistry {ledger} transfers />
	<details>
		<summary>Transferuri și confirmări ORGO</summary>
		{#each ledger.batches as batch (batch.id)}<p>
				{batch.transferredOn} · {batch.reference} · {money(batch.totalBani)}
			</p>{/each}
		<form method="POST" class="grid">
			<input type="hidden" name="action" value="confirm" /><label
				>Cotizație transferată<select name="id" required
					>{#each ledger.nationalItems.filter((i) => i.orgoState === 'awaiting_access') as i (i.id)}<option
							value={i.id}
							>{ledger.obligations.find((o) => o.id === i.obligationId)?.memberName} · {money(
								i.amountBani
							)}</option
						>{/each}</select
				></label
			><label>Dovada confirmării finale în ORGO<textarea name="evidence" required></textarea></label
			><button>Înregistrează verificarea manuală în ORGO</button>
		</form>
	</details>
</MembershipAdminPage>

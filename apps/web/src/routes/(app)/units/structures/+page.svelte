<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	let units = $state<PageData['preview']['units']>([]);
	let members = $state<PageData['preview']['members']>([]);
	$effect(() => {
		units = data.preview.units.map((u) => ({ ...u }));
		members = data.preview.members.map((m) => ({ ...m }));
	});
	let search = $state(''),
		inactive = $state(false),
		page = $state(0);
	const matches = $derived(
		members.filter(
			(m) =>
				m.inactive === inactive &&
				m.name.toLocaleLowerCase('ro').includes(search.toLocaleLowerCase('ro'))
		)
	);
	const visible = $derived(matches.slice(page * 25, (page + 1) * 25));
	const conflicts = $derived(
		members.filter(
			(m) =>
				m.unitId &&
				(units.find((u) => u.id === m.unitId)?.structureId ??
					data.registry.units.find((u) => u.id === m.unitId)?.structureId ??
					'cluj') !== m.structureId
		)
	);
</script>

<svelte:head><title>Repartizare Cluj și Florești</title></svelte:head>
<div class="setup">
	<a href={resolve('/units')}>← Unități și membri</a>
	<h1>Repartizare Cluj și Florești</h1>
	<p>
		Numele din Orgo propune apartenența inițială. Verifică unitățile și membrii înainte de
		confirmare. Schimbarea ulterioară a numelui nu va modifica apartenența.
	</p>
	{#if form?.message}<p role="status">{form.message}</p>{/if}
	{#if !data.preview.members.length && !data.preview.units.length}<p>
			Toate apartenențele sunt confirmate. Transferurile se fac din fișa membrului.
		</p>{:else}
		<form method="POST">
			<input type="hidden" name="action" value="classify" />
			<input type="hidden" name="members" value={JSON.stringify(members)} />
			<input type="hidden" name="units" value={JSON.stringify(units)} />
			<section>
				<h2>1. Unități</h2>
				<p>
					Subgrupele moștenesc structura unității. Dacă o unitate veche amestecă membri din ambele
					structuri, creează mai întâi unitățile locale din registru, apoi repartizează membrii
					aici.
				</p>
				{#each units as unit (unit.id)}<label
						>{unit.name}<select bind:value={unit.structureId}
							>{#each data.preview.structures as st (st.id)}<option value={st.id}>{st.name}</option
								>{/each}</select
						></label
					>{:else}<p>Unitățile sunt deja confirmate.</p>{/each}
			</section>
			<section>
				<h2>2. Membri</h2>
				<p>{members.length} apartenențe de verificat. Istoricul inactiv este separat.</p>
				<label>Caută membru<input bind:value={search} oninput={() => (page = 0)} /></label>
				<label class="check"
					><input type="checkbox" bind:checked={inactive} onchange={() => (page = 0)} />Arată doar
					istoricul inactiv ({members.filter((m) => m.inactive).length})</label
				>
				{#each visible as m (m.id)}<article>
						<strong>{m.name}</strong>
						<div class="fields">
							<label
								>Structură<select bind:value={m.structureId}
									>{#each data.preview.structures as st (st.id)}<option value={st.id}
											>{st.name}</option
										>{/each}</select
								></label
							>
							{#if m.unitId}<label
									>Unitate<select bind:value={m.unitId}
										>{#each data.registry.units.filter((u) => !u.parentId) as u (u.id)}<option
												value={u.id}>{u.name}</option
											>{/each}</select
									></label
								>{/if}
						</div>
						{#if conflicts.some((c) => c.id === m.id)}<p class="error">
								Alege o unitate din aceeași structură sau corectează apartenența.
							</p>{/if}
					</article>{:else}<p>Nu există membri pentru filtrul ales.</p>{/each}
				<div class="pages">
					<button type="button" disabled={page === 0} onclick={() => page--}>Înapoi</button><span
						>{matches.length ? page * 25 + 1 : 0}–{Math.min((page + 1) * 25, matches.length)} din {matches.length}</span
					><button type="button" disabled={(page + 1) * 25 >= matches.length} onclick={() => page++}
						>Înainte</button
					>
				</div>
			</section>
			{#if conflicts.length}<p class="error">
					{conflicts.length} repartizări nu corespund unității. Verifică inclusiv istoricul inactiv.
				</p>{/if}
			<label class="check"
				><input type="checkbox" name="confirm" required />Am verificat toate repartizările, inclusiv
				membrii inactivi.</label
			>
			<button disabled={conflicts.length > 0}>Confirmă repartizarea</button>
		</form>{/if}
</div>

<style>
	.setup {
		max-width: 1000px;
		margin: auto;
		color: #172b28;
	}
	section {
		background: white;
		padding: 24px;
		margin: 24px 0;
		border: 1px solid #dce5df;
		border-radius: 14px;
	}
	label {
		display: grid;
		gap: 8px;
		margin: 14px 0;
	}
	select,
	input,
	button {
		font: inherit;
		padding: 10px;
		border: 1px solid var(--sc-border-strong);
		border-radius: 7px;
	}
	button {
		background: var(--sc-accent);
		color: white;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	article {
		border-bottom: 1px solid #dce5df;
		padding: 16px 0;
	}
	.fields {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 16px;
	}
	.check,
	.pages {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.error {
		color: #9f352e;
	}
	p {
		line-height: 1.6;
	}
	a {
		color: var(--sc-accent);
	}
</style>

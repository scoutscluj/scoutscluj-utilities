<script lang="ts">
	import TableToolbar from '$lib/components/ui/TableToolbar.svelte';
	import TablePagination from '$lib/components/ui/TablePagination.svelte';
	import { highlightSearch, matchesSearch } from '$lib/components/ui/table-search';
	import { branchLabels } from '$lib/members/types';
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
		page = $state(0),
		pageSize = $state(25);
	const matches = $derived(
		members.filter((m) => m.inactive === inactive && matchesSearch(m.name, search))
	);
	const size = $derived(pageSize || Math.max(1, matches.length));
	const currentPage = $derived(Math.min(page, Math.max(0, Math.ceil(matches.length / size) - 1)));
	const visible = $derived(matches.slice(currentPage * size, (currentPage + 1) * size));
</script>

<svelte:head><title>Repartizare Cluj și Florești</title></svelte:head>
<div class="setup">
	<a href={resolve('/units')}>← Membri și unități</a>
	<h1>Repartizare Cluj și Florești</h1>
	<p class="intro">Verifică structura și categoria fiecărui membru.</p>
	<details class="setup-help">
		<summary>Cum se confirmă apartenența</summary>
		<p>
			Numele din Orgo propune apartenența inițială. Schimbarea ulterioară a numelui nu modifică
			apartenența. Transferurile se fac din fișa membrului.
		</p>
	</details>
	{#if form?.message}<p role="status">{form.message}</p>{/if}
	{#if !data.preview.members.length && !data.preview.units.length}<p>
			Toate apartenențele sunt confirmate. Transferurile se fac din fișa membrului.
		</p>{:else}
		<form method="POST">
			<input type="hidden" name="action" value="classify" />
			<input type="hidden" name="members" value={JSON.stringify(members)} />
			<input type="hidden" name="units" value={JSON.stringify(units)} />

			<section>
				<h2>Membri</h2>
				<p>{members.length} apartenențe de verificat</p>
				<TableToolbar
					>{#snippet filters()}<label
							>Caută membru<input
								type="search"
								bind:value={search}
								oninput={() => (page = 0)}
							/></label
						>{/snippet}</TableToolbar
				>
				<label class="check"
					><input type="checkbox" bind:checked={inactive} onchange={() => (page = 0)} />Arată doar
					istoricul inactiv ({members.filter((m) => m.inactive).length})</label
				>
				<div use:highlightSearch={search}>
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
								<label
									>Categorie principală<select bind:value={m.category}>
										<option value={null}>De verificat</option>
										{#each Object.entries(branchLabels) as [key, label] (key)}<option value={key}
												>{label}</option
											>{/each}
									</select></label
								>
							</div>
						</article>{:else}<p>Nu există membri pentru filtrul ales.</p>{/each}
				</div>
				<TablePagination
					bind:page
					bind:pageSize
					total={matches.length}
					loadedTotal={members.length}
				/>
			</section>
			{#if units.length}<section class="sources">
					<details>
						<summary>Surse Orgo și subunități ({units.length})</summary>
						<p>
							Unitățile sunt fixe. Păstrează sursa ca legătură Orgo sau confirmă explicit că numele
							vechi reprezintă o subunitate. Membrii compatibili din sursa veche vor fi repartizați
							în ea; apartenența lor principală rămâne aceeași.
						</p>
						{#each units as unit (unit.id)}<article>
								<label class="check"
									><input type="checkbox" bind:checked={unit.convert} />Transformă „{unit.name}” în
									subunitate</label
								>
								{#if unit.convert}<label
										>Unitate părinte<select bind:value={unit.parentId} required
											><option value="">Alege unitatea</option
											>{#each data.registry.units.filter((u) => !u.parentId && u.branch === unit.branch) as parent (parent.id)}<option
													value={parent.id}
													>{data.preview.structures.find((s) => s.id === parent.structureId)?.name} ·
													{parent.name}</option
												>{/each}</select
										></label
									>{/if}
							</article>{/each}
					</details>
				</section>{/if}
			<label class="check"
				><input type="checkbox" name="confirm" required />Am verificat toate repartizările, inclusiv
				membrii inactivi.</label
			>
			<button>Confirmă repartizarea</button>
		</form>{/if}
</div>

<style>
	.setup {
		max-width: 1000px;
		margin: auto;
		color: var(--sc-ink);
	}
	section {
		background: var(--sc-surface);
		padding: 24px;
		margin: 16px 0;
		border: 1px solid var(--sc-border);
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
		padding: 10px 12px;
		border: 1px solid var(--sc-control-border);
		border-radius: 8px;
		box-sizing: border-box;
	}
	select,
	input {
		background: var(--sc-surface);
		color: var(--sc-ink);
	}
	:is(select, input:not([type='checkbox']), button, .check) {
		min-height: 44px;
		min-width: 0;
		max-width: 100%;
	}
	:is(input, select, button, summary):focus-visible {
		outline: 2px solid var(--sc-focus);
		outline-offset: 2px;
	}
	h1 {
		overflow-wrap: anywhere;
		margin: 16px 0 8px;
	}
	h2 {
		font-size: 20px;
		margin: 0 0 8px;
	}
	.intro {
		margin: 8px 0;
	}
	.setup-help {
		margin: 8px 0 16px;
	}
	summary {
		min-height: 44px;
		align-content: center;
		cursor: pointer;
		color: var(--sc-link);
	}
	button {
		background: var(--sc-accent);
		color: var(--sc-on-accent);
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	article {
		border-bottom: 1px solid var(--sc-border);
		padding: 16px 0;
	}
	.fields {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 16px;
	}
	.check {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	p {
		line-height: 1.6;
	}
	a {
		color: var(--sc-link);
	}
	@media (max-width: 600px) {
		h1 {
			font-size: 26px;
			line-height: 32px;
		}
		section {
			padding: 16px;
		}
		.fields {
			grid-template-columns: minmax(0, 1fr);
			gap: 0;
		}
	}
</style>

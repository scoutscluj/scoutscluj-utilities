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
	<a href={resolve('/units')}>← Unități și membri</a>
	<h1>Repartizare Cluj și Florești</h1>
	<p>
		Numele din Orgo propune apartenența inițială. Verifică structura și categoria fiecărui membru
		înainte de confirmare. Schimbarea ulterioară a numelui nu va modifica apartenența.
	</p>
	{#if form?.message}<p role="status">{form.message}</p>{/if}
	{#if !data.preview.members.length && !data.preview.units.length}<p>
			Toate apartenențele sunt confirmate. Transferurile se fac din fișa membrului.
		</p>{:else}
		<form method="POST">
			<input type="hidden" name="action" value="classify" />
			<input type="hidden" name="members" value={JSON.stringify(members)} />
			<input type="hidden" name="units" value={JSON.stringify(units)} />
			{#if units.length}<section>
					<h2>Surse Orgo și subunități</h2>
					<p>
						Unitățile sunt fixe. Păstrează sursa ca legătură Orgo sau confirmă explicit că numele
						vechi reprezintă o subunitate. Membrii compatibili din sursa veche vor fi repartizați în
						ea; apartenența lor principală rămâne aceeași.
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
												>{data.preview.structures.find((s) => s.id === parent.structureId)?.name} · {parent.name}</option
											>{/each}</select
									></label
								>{/if}
						</article>{/each}
				</section>{/if}
			<section>
				<h2>Membri</h2>
				<p>{members.length} apartenențe de verificat. Istoricul inactiv este separat.</p>
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
		margin: 24px 0;
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
		color: var(--sc-accent);
	}
</style>

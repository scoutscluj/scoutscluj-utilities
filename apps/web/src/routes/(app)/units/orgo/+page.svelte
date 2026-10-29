<script lang="ts">
	import TableView from '$lib/components/ui/TableView.svelte';
	import { resolve } from '$app/paths';
	import type { PageData, ActionData } from './$types';
	import { branchLabels } from '$lib/members/types';
	import InactiveMembers from '$lib/members/InactiveMembers.svelte';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	// eslint-disable-next-line svelte/prefer-writable-derived -- Editable rows need deep reactive state for checkbox and branch bindings.
	let selected = $state<
		{ orgoId: number; name: string; branch: string; structureId: string; include: boolean }[]
	>([]);
	$effect(() => {
		selected = (data.preview?.units ?? [])
			.filter((u) => !data.preview?.importedUnitIds?.includes(u.id))
			.map((u) => ({
				orgoId: u.id,
				name: u.name,
				branch: '',
				structureId: 'cluj',
				include: false
			}));
	});
</script>

<svelte:head><title>Import Orgo · Membri</title></svelte:head>
<div class="workspace">
	<a href={resolve('/units')}>← Membri și unități</a>
	<h1>Integrare Orgo (membri.scout.ro)</h1>
	{#if form?.message}<p role="status">{form.message}</p>{/if}{#if data.message}<p role="alert">
			{data.message}
		</p>{/if}{#if data.preview}<p>{data.preview.message}</p>
		<p>Token server-to-server · Scrieri {data.preview.writesEnabled ? 'activate' : 'neactivate'}</p>
		<h2>Structura identificată</h2>
		<p>
			Patrulele din Orgo (membri.scout.ro) sunt excluse. Grupele se organizează separat în
			aplicație.
		</p>
		<p>
			Unitățile se importă numai cu ramura și structura confirmate. Rolurile active și repartizările
			compatibile sunt preluate din Orgo.
		</p>
		<form method="POST">
			<input type="hidden" name="action" value="refresh" /><button
				>Actualizează fișele existente din Orgo</button
			>
		</form>
		<h2>Registru pentru import</h2>
		<TableView label="Caută membru în Orgo"
			><table>
				<thead
					><tr><th>ID Orgo</th><th>Nume</th><th>Status Orgo</th><th>Tip și funcții active</th></tr
					></thead
				><tbody
					>{#each data.preview.members ?? [] as member (member.id)}<tr
							><td>{member.id}</td><td>{member.name}</td><td>{member.status}</td><td
								>{member.type ?? '—'}{#each member.roles ?? [] as role, i (i)}<small
										>{role.name}{role.unitName ? ` · ${role.unitName}` : ''}</small
									>{/each}</td
							></tr
						>{/each}</tbody
				>
			</table></TableView
		>
		<InactiveMembers members={data.preview.inactiveMembers ?? []} />
		<form method="POST">
			<input type="hidden" name="version" value={data.preview.version ?? ''} /><input
				type="hidden"
				name="action"
				value="import"
			/><input
				type="hidden"
				name="units"
				value={JSON.stringify(
					selected
						.filter((u) => u.include)
						.map(({ orgoId, branch, structureId }) => ({ orgoId, branch, structureId }))
				)}
			/>
			<h2>Unități de importat</h2>
			{#each selected as unit (unit.orgoId)}<div class="unit">
					<label
						><input type="checkbox" bind:checked={unit.include} />{unit.name} · Orgo #{unit.orgoId}</label
					>{#if unit.include}<label
							>Ramură<select bind:value={unit.branch} required
								><option value="">Alege ramura</option
								>{#each Object.entries(branchLabels) as [id, name] (id)}<option value={id}
										>{name}</option
									>{/each}</select
							></label
						><label
							>Structură<select bind:value={unit.structureId}
								><option value="cluj">Cluj</option><option value="floresti">Florești</option
								></select
							></label
						>{/if}
				</div>{:else}<p>Unitățile identificate au fost deja importate.</p>{/each}
			<label
				><input type="checkbox" name="confirm" required />Am verificat registrul. Confirm importul
				identităților, rolurilor și accesului afișat. Clasele lipsă și repartizările ambigue se
				verifică separat.</label
			><button>Importă registrul verificat</button>
		</form>{/if}
</div>

<style>
	.unit {
		padding: 16px;
		border: 1px solid #dce5df;
		border-radius: 10px;
		display: grid;
		gap: 12px;
	}
	select {
		font: inherit;
		padding: 10px;
	}
	.workspace {
		max-width: 1000px;
		margin: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
	}
	th,
	td {
		text-align: left;
		border-bottom: 1px solid #dce5df;
		padding: 12px;
	}
	p {
		line-height: 1.6;
	}
	form {
		margin: 24px 0;
		display: grid;
		gap: 20px;
	}
	button {
		padding: 12px;
		background: var(--sc-accent);
		color: white;
		border: 0;
		border-radius: 8px;
		cursor: pointer;
	}
	a {
		color: var(--sc-accent);
	}
</style>

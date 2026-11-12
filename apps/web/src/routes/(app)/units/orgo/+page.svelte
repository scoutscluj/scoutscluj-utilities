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
	<h1>Integrare Orgo</h1>
	{#if form?.message}<p role="status">{form.message}</p>{/if}{#if data.message}<p role="alert">
			{data.message}
		</p>{/if}{#if data.preview}
		<details class="integration-help">
			<summary>Despre import și conexiune</summary>
			<p>{data.preview.message}</p>
			<p>
				Token server-to-server · Scrieri {data.preview.writesEnabled ? 'activate' : 'neactivate'}
			</p>
			<p>
				Patrulele din Orgo sunt excluse. Grupele se organizează separat în aplicație. Unitățile se
				importă cu ramura și structura confirmate; rolurile active și repartizările compatibile sunt
				preluate din Orgo.
			</p>
		</details>
		<form method="POST">
			<input type="hidden" name="action" value="refresh" /><button>Actualizează din Orgo</button>
		</form>
		<h2>Registru pentru import</h2>
		<TableView label="Caută membru în Orgo" compact
			><table>
				<thead
					><tr><th>ID Orgo</th><th>Nume</th><th>Status Orgo</th><th>Tip și funcții active</th></tr
					></thead
				><tbody
					>{#each data.preview.members ?? [] as member (member.id)}<tr
							><td>{member.id}</td><td>{member.name}</td><td
								><span class="member-status"
									>{member.status === 'ACTIVE'
										? 'Activ'
										: member.status === 'INACTIVE'
											? 'Inactiv'
											: member.status}</span
								></td
							><td
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
			<details class="import-units">
				<summary>Unități de importat ({selected.length})</summary>
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
			</details>
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
		border: 1px solid var(--sc-border);
		border-radius: 10px;
		display: grid;
		gap: 12px;
	}
	:is(button, select, input:not([type='checkbox'])) {
		min-height: 44px;
		min-width: 0;
		max-width: 100%;
		box-sizing: border-box;
	}
	select,
	input {
		background: var(--sc-surface);
		color: var(--sc-ink);
		border: 1px solid var(--sc-control-border);
		border-radius: 8px;
	}
	:is(button, select, input):focus-visible {
		outline: 2px solid var(--sc-focus);
		outline-offset: 2px;
	}
	h1 {
		overflow-wrap: anywhere;
	}
	select {
		font: inherit;
		padding: 10px;
	}
	.integration-help {
		margin: 8px 0;
	}
	summary {
		min-height: 44px;
		align-content: center;
		cursor: pointer;
		color: var(--sc-link);
	}
	h1 {
		margin: 16px 0 8px;
	}
	h2 {
		font-size: 20px;
		margin: 16px 0;
	}
	.member-status {
		color: var(--sc-ink);
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
		border-bottom: 1px solid var(--sc-border);
		padding: 12px;
	}
	p {
		line-height: 1.6;
	}
	form {
		margin: 16px 0;
		display: grid;
		gap: 16px;
		justify-items: start;
	}
	button {
		padding: 12px;
		background: var(--sc-accent);
		color: var(--sc-on-accent);
		border: 0;
		border-radius: 8px;
		cursor: pointer;
	}
	a {
		color: var(--sc-link);
	}
	@media (max-width: 600px) {
		h1 {
			font-size: 26px;
			line-height: 32px;
		}
		thead {
			display: none;
		}
		table,
		tbody {
			display: block;
		}
		tr {
			display: grid;
			grid-template-columns: minmax(0, 1fr);
			padding: 12px 0;
			border-bottom: 1px solid var(--sc-border);
		}
		td {
			display: block;
			border: 0;
			padding: 4px 0;
			overflow-wrap: anywhere;
		}
		td:nth-child(2) {
			grid-row: 1;
			font-weight: 600;
		}
		td:first-child::before {
			content: 'ID Orgo: ';
			color: var(--sc-muted);
		}
	}
</style>

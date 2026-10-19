<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>Import Orgo · Membri</title></svelte:head>
<div class="workspace">
	<a href={resolve('/units')}>← Unități și membri</a>
	<h1>Integrare Orgo</h1>
	{#if form?.message}<p role="status">{form.message}</p>{/if}{#if data.message}<p role="alert">
			{data.message}
		</p>{/if}{#if data.preview}<p>{data.preview.message}</p>
		<p>Token server-to-server · Scrieri {data.preview.writesEnabled ? 'activate' : 'neactivate'}</p>
		<h2>Structura identificată</h2>
		<ul>
			{#each data.preview.units ?? [] as unit (unit.id)}<li>
					#{unit.id} · {unit.name} · {unit.type ?? 'tip neprecizat'}{unit.parent
						? ` · părinte #${unit.parent}`
						: ''}
				</li>{/each}
		</ul>
		<h2>Registru pentru import</h2>
		<table>
			<thead><tr><th>ID Orgo</th><th>Nume</th><th>Status Orgo</th></tr></thead><tbody
				>{#each data.preview.members ?? [] as member (member.id)}<tr
						><td>{member.id}</td><td>{member.name}</td><td>{member.status}</td></tr
					>{/each}</tbody
			>
		</table>
		<form method="POST">
			<input type="hidden" name="action" value="import" /><label
				><input type="checkbox" name="confirm" required />Am verificat registrul. Confirm importul
				identităților; clasele și repartizările vor fi completate separat.</label
			><button>Importă registrul verificat</button>
		</form>{/if}
</div>

<style>
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
		background: #245b46;
		color: white;
		border: 0;
		border-radius: 8px;
		cursor: pointer;
	}
	a {
		color: #216249;
	}
</style>

<script lang="ts">
	import { resolve } from '$app/paths';
	let {
		members,
		linkToProfile = false
	}: {
		members: { id: string | number; name: string; orgoId?: number | null }[];
		linkToProfile?: boolean;
	} = $props();
	let open = $state(false),
		search = $state(''),
		page = $state(0);
	const matching = $derived(
		members.filter((m) => m.name.toLocaleLowerCase('ro').includes(search.toLocaleLowerCase('ro')))
	);
	const pages = $derived(Math.max(1, Math.ceil(matching.length / 25)));
	$effect(() => {
		if (search || members) page = 0;
	});
</script>

<section aria-label="Membri inactivi din Orgo">
	<details bind:open>
		<summary>Membri inactivi din Orgo ({members.length})</summary>
		{#if open}
			<p>
				Membrii istorici cu statusul „INACTIVE” în Orgo sunt păstrați aici, separat de registrul
				curent.
			</p>
			<label>Caută membru inactiv<input bind:value={search} placeholder="Nume" /></label>
			<p role="status">
				{matching.length} membri găsiți · Pagina {Math.min(page + 1, pages)} din {pages}
			</p>
			<ul>
				{#each matching.slice(page * 25, (page + 1) * 25) as member (member.id)}
					<li>
						{#if linkToProfile}<a href={resolve(`/units/${member.id}`)}>{member.name}</a
							>{:else}{member.name}{/if}
					</li>
				{:else}<li>Nu există membri inactivi pentru căutarea aleasă.</li>{/each}
			</ul>
			{#if pages > 1}<nav aria-label="Paginare membri inactivi">
					<button type="button" disabled={page === 0} onclick={() => page--}>Înapoi</button>
					<button type="button" disabled={page + 1 >= pages} onclick={() => page++}>Înainte</button>
				</nav>{/if}
		{/if}
	</details>
</section>

<style>
	section {
		margin: 24px 0;
		padding: 20px;
		border: 1px solid #dce5df;
		border-radius: 12px;
		background: white;
	}
	summary {
		cursor: pointer;
		font-weight: 600;
	}
	p {
		line-height: 1.6;
	}
	label {
		display: grid;
		gap: 8px;
		max-width: 360px;
	}
	input {
		padding: 10px;
		border: 1px solid #bacbc2;
		border-radius: 8px;
		font: inherit;
	}
	li {
		padding: 8px 0;
	}
	a {
		color: #216249;
	}
	nav {
		display: flex;
		gap: 12px;
	}
	button {
		padding: 10px 16px;
		border: 1px solid #bacbc2;
		border-radius: 8px;
		background: #f5f8f6;
		cursor: pointer;
		font: inherit;
	}
	button:disabled {
		opacity: 0.5;
		cursor: default;
	}
</style>

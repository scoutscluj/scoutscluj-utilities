<script lang="ts">
	import { resolve } from '$app/paths';
	import TableToolbar from '$lib/components/ui/TableToolbar.svelte';
	import TablePagination from '$lib/components/ui/TablePagination.svelte';
	import { highlightSearch, matchesSearch } from '$lib/components/ui/table-search';
	let {
		members,
		linkToProfile = false
	}: {
		members: { id: string | number; name: string; orgoId?: number | null }[];
		linkToProfile?: boolean;
	} = $props();
	let open = $state(false),
		search = $state(''),
		page = $state(0),
		pageSize = $state(25);
	const matching = $derived(members.filter((m) => matchesSearch(m.name, search)));
	const size = $derived(pageSize || Math.max(1, matching.length));
	const currentPage = $derived(Math.min(page, Math.max(0, Math.ceil(matching.length / size) - 1)));
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
			<TableToolbar
				>{#snippet filters()}<label
						>Caută membru inactiv<input
							type="search"
							bind:value={search}
							placeholder="Nume"
						/></label
					>{/snippet}</TableToolbar
			>
			<ul use:highlightSearch={search}>
				{#each matching.slice(currentPage * size, (currentPage + 1) * size) as member (member.id)}
					<li>
						{#if linkToProfile}<a href={resolve(`/units/${member.id}`)}>{member.name}</a
							>{:else}{member.name}{/if}
					</li>
				{:else}<li>Nu există membri inactivi pentru căutarea aleasă.</li>{/each}
			</ul>
			<TablePagination
				bind:page
				bind:pageSize
				total={matching.length}
				loadedTotal={members.length}
				label="Paginare membri inactivi"
			/>
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
		color: var(--sc-accent);
	}
</style>

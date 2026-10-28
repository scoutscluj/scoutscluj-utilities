<script lang="ts">
	let {
		users,
		coordinatorId = $bindable(),
		administratorIds = $bindable()
	}: {
		users: { id: number; displayName: string }[];
		coordinatorId: number;
		administratorIds: number[];
	} = $props();
	let search = $state('');
</script>

<label
	>Organizator<select bind:value={coordinatorId} required
		>{#each users as user (user.id)}<option value={user.id}>{user.displayName}</option
			>{/each}</select
	></label
>
<fieldset>
	<legend>Administratori ai activității</legend>
	<p>
		Au acces la configurare, înscrieri, acorduri, încasări și departamentele activității. Nu primesc
		roluri globale în platformă.
	</p>
	<label>Caută o persoană<input type="search" bind:value={search} /></label>
	<div class="people">
		{#each users.filter((user) => user.displayName
				.toLocaleLowerCase('ro')
				.includes(search.toLocaleLowerCase('ro'))) as user (user.id)}<label class="choice"
				><input
					type="checkbox"
					value={user.id}
					bind:group={administratorIds}
				/>{user.displayName}</label
			>{/each}
	</div>
</fieldset>

<style>
	label {
		display: grid;
		gap: 8px;
	}
	fieldset {
		border: 1px solid var(--sc-border);
		border-radius: 10px;
		padding: 18px;
		display: grid;
		gap: 12px;
	}
	.people {
		max-height: 230px;
		overflow: auto;
		display: grid;
		gap: 10px;
	}
	.choice {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	input:not([type='checkbox']),
	select {
		padding: 10px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		font: inherit;
	}
	p {
		margin: 0;
		line-height: 1.5;
	}
</style>

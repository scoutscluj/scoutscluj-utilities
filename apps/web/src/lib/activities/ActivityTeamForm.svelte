<script lang="ts">
	import { untrack } from 'svelte';
	import ActivityTeamFields from './ActivityTeamFields.svelte';
	let {
		activity,
		users,
		message
	}: {
		activity: { coordinatorId: number; administratorIds?: number[]; createdById?: number | null };
		users: { id: number; displayName: string }[];
		message?: string;
	} = $props();
	let coordinatorId = $state(untrack(() => activity.coordinatorId));
	let administratorIds = $state(untrack(() => [...(activity.administratorIds ?? [])]));
</script>

<form method="POST" action="?/team" id="echipa">
	<h2>Organizator și administratori</h2>
	<p>
		Creator: {users.find((user) => user.id === activity.createdById)?.displayName ??
			'Nespecificat'}. Modificarea organizatorului păstrează istoricul creării.
	</p>
	<ActivityTeamFields {users} bind:coordinatorId bind:administratorIds /><input
		type="hidden"
		name="coordinatorId"
		value={coordinatorId}
	/>{#each administratorIds as id (id)}<input
			type="hidden"
			name="administratorIds"
			value={id}
		/>{/each}{#if message}<p role="status">{message}</p>{/if}<button>Salvează echipa</button>
</form>

<style>
	form {
		display: grid;
		gap: 18px;
		padding: 20px;
		background: var(--sc-surface);
		border: 1px solid var(--sc-border);
		border-radius: 10px;
		scroll-margin-top: 24px;
	}
	h2,
	p {
		margin: 0;
	}
	p {
		line-height: 1.5;
	}
	button {
		justify-self: start;
		padding: 10px 18px;
		border: 0;
		border-radius: 7px;
		background: var(--sc-accent);
		color: white;
		font: inherit;
	}
</style>

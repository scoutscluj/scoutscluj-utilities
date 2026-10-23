<script lang="ts">
	import { formatRole } from '$lib/auth/roles';
	import NotificationSummary from '$lib/profile/NotificationSummary.svelte';
	import PersonalObjectives from '$lib/profile/PersonalObjectives.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const user = $derived(data.user);
	const connection = $derived(user.orgoConnection);
	const roles = $derived(user.roles);
</script>

<svelte:head><title>Profil | Scouts Cluj Utilities</title></svelte:head>

<section class="profile-header">
	<div class="avatar" aria-hidden="true">{user.displayName.slice(0, 1)}</div>
	<div>
		<p class="eyebrow">Profil</p>
		<h1>{user.displayName}</h1>
		<p>{user.email ?? 'Email indisponibil'}</p>
	</div>
</section>

<section class="profile-grid" aria-label="Detalii profil">
	<article>
		<h2>Roluri</h2>
		{#if roles.length}
			<div class="chips">
				{#each roles as role (role)}
					<span>{formatRole(role)}</span>
				{/each}
			</div>
		{:else}
			<p>Membru autentificat fără rol administrativ.</p>
		{/if}
	</article>

	<article>
		<img src="/branding/orgo-symbol.png" alt="ORGO" width="42" height="42" />
		<h2>Conexiune Orgo</h2>
		<dl>
			<div>
				<dt>Status</dt>
				<dd>{connection ? 'Conectat' : 'Indisponibil'}</dd>
			</div>
			<div>
				<dt>Card ID</dt>
				<dd>{connection?.cardId ?? '-'}</dd>
			</div>
			<div>
				<dt>Orgo ID</dt>
				<dd>{connection?.orgoUserId ?? '-'}</dd>
			</div>
			<div>
				<dt>Ultimul login</dt>
				<dd>{connection?.lastLoginAt ?? '-'}</dd>
			</div>
		</dl>
	</article>

	<NotificationSummary />
</section>

<PersonalObjectives objectives={data.objectives} error={data.objectivesError} />

<form method="POST" action="/auth/logout" class="logout-form">
	<button type="submit">Deconectare</button>
</form>

<style>
	.profile-header {
		display: flex;
		align-items: center;
		gap: 16px;
	}
	.profile-header > div:last-child {
		min-width: 0;
	}
	.avatar {
		width: 64px;
		height: 64px;
		flex-shrink: 0;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: var(--sc-accent-soft);
		color: var(--sc-accent);
		font-size: 26px;
		font-weight: 600;
	}
	.eyebrow {
		margin: 0;
		color: var(--sc-muted);
		font-size: 12px;
	}
	h1 {
		margin: 4px 0;
		font-size: 30px;
		font-weight: 600;
		letter-spacing: -0.02em;
		overflow-wrap: anywhere;
	}
	.profile-header p:not(.eyebrow) {
		margin: 0;
		color: var(--sc-muted);
		overflow-wrap: anywhere;
	}
	.profile-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 16px;
		margin-top: 28px;
	}
	article {
		border: 1px solid var(--sc-border);
		border-radius: var(--sc-radius);
		background: var(--sc-surface);
		padding: 20px;
	}
	h2 {
		margin: 0 0 16px;
		font-size: 18px;
		font-weight: 600;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.chips span {
		border-radius: 6px;
		background: var(--sc-inset);
		color: var(--sc-ink);
		padding: 6px 10px;
		font-size: 13px;
	}
	dl,
	dd {
		margin: 0;
	}
	dl {
		display: grid;
		gap: 12px;
	}
	dl div {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		padding-bottom: 10px;
		border-bottom: 1px solid var(--sc-border);
		font-size: 13px;
	}
	dt {
		color: var(--sc-muted);
	}
	dd {
		text-align: right;
		overflow-wrap: anywhere;
	}
	.logout-form {
		margin-top: 24px;
	}
	.logout-form button {
		min-height: 38px;
		border: 1px solid var(--sc-border-strong);
		border-radius: 7px;
		background: var(--sc-surface);
		padding: 8px 14px;
		color: var(--sc-ink);
		cursor: pointer;
	}
	@media (max-width: 1000px) {
		.profile-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

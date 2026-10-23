<script lang="ts">
	import ProfileInformation from '$lib/profile/ProfileInformation.svelte';
	import LogOut from '@lucide/svelte/icons/log-out';
	import NotificationStatusIcon from '$lib/profile/NotificationStatusIcon.svelte';
	import PersonalObjectives from '$lib/profile/PersonalObjectives.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const user = $derived(data.user);
	let failedAvatar = $state<string>();
</script>

<svelte:head><title>Profil | Scouts Cluj Utilities</title></svelte:head>

<header class="profile-header">
	<div class="profile-identity">
		<div class="avatar">
			{#if user.avatarUrl && failedAvatar !== user.avatarUrl}
				<img
					src={user.avatarUrl}
					alt={`Fotografie de profil: ${user.displayName}`}
					width="64"
					height="64"
					referrerpolicy="no-referrer"
					onerror={() => {
						failedAvatar = user.avatarUrl;
					}}
				/>
			{:else}<span aria-hidden="true">{user.displayName.slice(0, 1)}</span>{/if}
		</div>
		<div class="identity-text">
			<p class="eyebrow">Profil</p>
			<h1>{user.displayName}</h1>
			<p>{user.email ?? 'Email indisponibil'}</p>
		</div>
	</div>
	<div class="profile-actions">
		<NotificationStatusIcon />
		<form method="POST" action="/auth/logout">
			<button type="submit" aria-label="Deconectare" title="Deconectare">
				<LogOut size={19} aria-hidden="true" /><span>Deconectare</span>
			</button>
		</form>
	</div>
</header>

<ProfileInformation {user} />

<PersonalObjectives objectives={data.objectives} error={data.objectivesError} />

<style>
	.profile-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
	}
	.profile-identity {
		display: flex;
		align-items: center;
		gap: 16px;
		min-width: 0;
	}
	.identity-text {
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
	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: inherit;
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
	.identity-text p:not(.eyebrow) {
		margin: 0;
		color: var(--sc-muted);
		overflow-wrap: anywhere;
	}
	.profile-actions {
		display: flex;
		align-items: center;
		flex-shrink: 0;
		gap: 10px;
	}
	.profile-actions form {
		margin: 0;
	}
	.profile-actions button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		min-height: 40px;
		border: 1px solid var(--sc-border-strong);
		border-radius: 7px;
		background: var(--sc-surface);
		padding: 8px 12px;
		color: var(--sc-ink);
		font: inherit;
		font-size: 14px;
		cursor: pointer;
	}
	.profile-actions button:hover {
		background: var(--sc-inset);
		color: var(--sc-accent);
	}
	.profile-actions button:focus-visible {
		outline: 2px solid var(--sc-accent);
		outline-offset: 3px;
	}
	@media (max-width: 650px) {
		.profile-header {
			gap: 12px;
		}
		.profile-identity {
			gap: 12px;
		}
		.avatar {
			width: 48px;
			height: 48px;
			font-size: 22px;
		}
		h1 {
			font-size: 23px;
		}
		.identity-text p:not(.eyebrow) {
			font-size: 13px;
		}
		.profile-actions {
			gap: 8px;
		}
		.profile-actions button {
			width: 40px;
			padding: 0;
		}
		.profile-actions button span {
			display: none;
		}
	}
</style>

<script lang="ts">
	import { page } from '$app/state';
	import {
		activitySettingsSections,
		activitySettingsHref
	} from '$lib/activities/activity-settings';
	let { data, children } = $props();
	const current = $derived(
		activitySettingsSections.find(
			(section) => activitySettingsHref(data.activity.id, section.key) === page.url.pathname
		)
	);
</script>

<svelte:head><title>{current?.label ?? 'Setări'} — {data.activity.title}</title></svelte:head>
<section class="settings-page">
	<h1>Setările activității</h1>
	<nav aria-label="Setările activității">
		{#each activitySettingsSections as section (section.key)}
			{@const href = activitySettingsHref(data.activity.id, section.key)}
			<a
				{href}
				class:active={page.url.pathname === href}
				aria-current={page.url.pathname === href ? 'page' : undefined}>{section.label}</a
			>
		{/each}
	</nav>
	<div class="settings-content">{@render children()}</div>
</section>

<style>
	.settings-page {
		display: grid;
		gap: 20px;
		max-width: 1100px;
	}
	h1 {
		margin: 0;
	}
	nav {
		display: flex;
		gap: 4px;
		flex-wrap: wrap;
		border-bottom: 1px solid var(--sc-border);
		padding-bottom: 8px;
	}
	nav a {
		display: flex;
		align-items: center;
		min-height: 38px;
		padding: 8px 12px;
		color: var(--sc-ink-muted);
		border-radius: 7px;
		text-decoration: none;
		font-size: 14px;
	}
	nav a:hover {
		background: var(--sc-surface);
		color: var(--sc-ink);
	}
	nav a.active {
		background: var(--sc-surface);
		color: var(--sc-accent);
		font-weight: 600;
		box-shadow: inset 0 -2px var(--sc-accent);
	}
	nav a:focus-visible {
		outline: 2px solid var(--sc-accent);
		outline-offset: 2px;
	}
	.settings-content {
		min-width: 0;
	}
</style>

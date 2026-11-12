<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
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
<section class="settings-page" class:wide={current?.key === 'consent'}>
	<h1>Setările activității</h1>
	<label class="mobile-section"
		><span>Secțiune setări</span><select
			aria-label="Secțiune setări"
			value={current?.key ?? 'general'}
			onchange={(event) => {
				const next = activitySettingsSections.find(
					(section) => section.key === event.currentTarget.value
				);
				if (next) void goto(activitySettingsHref(data.activity.id, next.key));
			}}
			>{#each activitySettingsSections as section (section.key)}<option value={section.key}
					>{section.label}</option
				>{/each}</select
		></label
	>
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
	.mobile-section {
		display: none;
	}
	@media (max-width: 620px) {
		.settings-page nav {
			display: none;
		}
		.mobile-section {
			display: block;
		}
		.mobile-section span {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
		}
		.mobile-section select {
			width: 100%;
			min-height: 44px;
			padding: 10px 12px;
			border: 1px solid var(--sc-control-border);
			border-radius: 7px;
			color: var(--sc-ink);
			background: var(--sc-surface);
			font: inherit;
		}
	}

	.settings-page {
		display: grid;
		gap: 16px;
		max-width: 1100px;
		min-width: 0;
	}
	.settings-page.wide {
		max-width: none;
		grid-template-columns: minmax(0, 1fr);
	}
	h1 {
		font-size: clamp(24px, 3vw, 30px);
		margin: 0;
	}
	nav {
		display: flex;
		gap: 4px;
		flex-wrap: nowrap;
		overflow-x: auto;
		border-bottom: 1px solid var(--sc-border);
		padding-bottom: 8px;
	}
	nav a {
		display: flex;
		align-items: center;
		min-height: 44px;
		white-space: nowrap;
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
		color: var(--sc-link);
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

	select {
		background: var(--sc-inset);
		color: var(--sc-ink);
		border-color: var(--sc-control-border);
	}
</style>

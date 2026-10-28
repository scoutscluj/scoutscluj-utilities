<script lang="ts">
	import { activitySettingsHref } from './activity-settings';
	const sections = {
		inscrieri: 'registrations',
		acord: 'consent',
		plati: 'payments',
		echipa: 'team'
	} as const;
	let {
		activityId,
		section,
		label
	}: { activityId: number; section: 'inscrieri' | 'acord' | 'plati' | 'echipa'; label: string } =
		$props();
</script>

<a href={activitySettingsHref(activityId, sections[section])} aria-label={label} title={label}
	><svg
		aria-hidden="true"
		viewBox="0 0 24 24"
		width="20"
		height="20"
		fill="none"
		stroke="currentColor"
		stroke-width="1.7"
		><path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3Z" /><circle
			cx="12"
			cy="12"
			r="3"
		/></svg
	><span>{label}</span></a
>

<style>
	a {
		display: inline-flex;
		gap: 8px;
		align-items: center;
		padding: 8px 12px;
		min-height: 38px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		color: var(--sc-ink);
		background: var(--sc-surface);
		text-decoration: none;
	}
	a:focus-visible {
		outline: 2px solid var(--sc-accent);
		outline-offset: 2px;
	}
</style>

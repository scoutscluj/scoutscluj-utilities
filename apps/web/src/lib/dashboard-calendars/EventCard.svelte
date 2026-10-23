<script lang="ts">
	import { eventTime, localDay, type CalendarEvent } from './calendar';
	let {
		event,
		day,
		ongoing = false
	}: { event: CalendarEvent; day?: string; ongoing?: boolean } = $props();
	const continuing = $derived(day && (event.allDay ? event.start : localDay(event.start)) < day);
</script>

<article class={{ ongoing }}>
	<div class="time">
		{eventTime(event)}{#if ongoing}<span>În desfășurare</span>{/if}
	</div>
	<h4>{event.title}</h4>
	{#if continuing}<p class="continuation">Continuă din ziua precedentă</p>{/if}
	{#if event.location}<p class="location">{event.location}</p>{/if}
	{#if event.description}<details>
			<summary>Detalii · {event.title}</summary>
			<p class="description">{event.description}</p>
		</details>{/if}
</article>

<style>
	article {
		border-left: 3px solid var(--sc-accent);
		background: var(--sc-canvas);
		border-radius: 0 8px 8px 0;
		padding: 12px 14px;
		overflow-wrap: anywhere;
	}
	article.ongoing {
		border-left-color: #3d7656;
	}
	.time {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		color: var(--sc-muted);
		font-size: 0.8rem;
		font-variant-numeric: tabular-nums;
	}
	.time span {
		color: #285b3d;
		background: #e6f1e9;
		padding: 2px 6px;
		border-radius: 4px;
	}
	h4 {
		font-size: 0.95rem;
		line-height: 1.45;
		margin: 5px 0 0;
	}
	p {
		margin: 6px 0 0;
		font-size: 0.85rem;
	}
	.location,
	.continuation {
		color: var(--sc-muted);
	}
	summary {
		cursor: pointer;
		min-height: 44px;
		display: flex;
		align-items: center;
		color: var(--sc-accent);
		font-size: 0.8rem;
	}
	.description {
		white-space: pre-wrap;
	}
	summary:focus-visible {
		outline: 2px solid var(--sc-accent);
		outline-offset: 2px;
	}
</style>

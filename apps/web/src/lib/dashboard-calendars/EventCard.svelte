<script lang="ts">
	import Clock3 from '@lucide/svelte/icons/clock-3';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Sun from '@lucide/svelte/icons/sun';
	import CircleDot from '@lucide/svelte/icons/circle-dot';
	import Check from '@lucide/svelte/icons/check';
	import Info from '@lucide/svelte/icons/info';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import CornerDownRight from '@lucide/svelte/icons/corner-down-right';
	import {
		addDays,
		eventDetails,
		eventEnd,
		eventStart,
		eventTime,
		localDay,
		shortDate,
		type CalendarEvent
	} from './calendar';
	let {
		event,
		day,
		now,
		variant = 'event',
		datesInRail = false
	}: {
		event: CalendarEvent;
		day?: string;
		now: number;
		variant?: 'event' | 'booking';
		datesInRail?: boolean;
	} = $props();
	const detailsId = $props.id();
	let expanded = $state(false);
	const continuing = $derived(day && (event.allDay ? event.start : localDay(event.start)) < day);
	const ended = $derived(eventEnd(event) <= now);
	const ongoing = $derived(eventStart(event) <= now && !ended);
	const details = $derived(eventDetails(event));
	const location = $derived(
		variant === 'booking' && /^(sediu|sediul centrului local)$/i.test(event.location?.trim() ?? '')
			? ''
			: event.location
	);
	const allDayEnd = $derived(
		event.allDay && event.end > addDays(event.start, 1) ? shortDate(addDays(event.end, -1)) : null
	);
</script>

<article
	class={[
		'event-card',
		variant,
		{ ongoing, ended, 'all-day': event.allDay, 'has-details': details }
	]}
>
	<h4>{event.title}</h4>
	<div class="event-meta">
		<span class="event-time"
			>{#if event.allDay}<Sun size={15} aria-hidden="true" />Toată ziua{:else}<Clock3
					size={15}
					aria-hidden="true"
				/>{eventTime(event)}{/if}</span
		>{#if allDayEnd && !datesInRail}<span class="end-date">până la {allDayEnd}</span
			>{/if}{#if ongoing}<span class="status live"
				><CircleDot size={12} aria-hidden="true" />În desfășurare</span
			>{:else if ended}<span class="status past"
				><Check size={12} aria-hidden="true" />Încheiat</span
			>{/if}
	</div>
	{#if location}<a
			class="event-location"
			href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
			target="_blank"
			rel="noopener noreferrer"
			aria-label={`Deschide ${location} în Google Maps (filă nouă)`}
		>
			<MapPin size={15} aria-hidden="true" /><span>{location}</span>
		</a>{/if}
	{#if continuing}<p class="continuation">
			<CornerDownRight size={14} aria-hidden="true" />Continuă din ziua precedentă
		</p>{/if}
	{#if details}<button
			class="details-toggle"
			aria-label={`Detalii pentru ${event.title}`}
			aria-expanded={expanded}
			aria-controls={detailsId}
			onclick={() => {
				expanded = !expanded;
			}}
			><Info size={16} aria-hidden="true" /><ChevronDown
				size={12}
				class={expanded ? 'rotated' : ''}
				aria-hidden="true"
			/></button
		>
		<!-- Descriptions are sanitized by calendarDescription at the API boundary. -->
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		<div class="description" id={detailsId} hidden={!expanded}>{@html details}</div>{/if}
</article>

<style>
	.event-card {
		--event-color: #245da8;
		--event-tint: #f3f7fd;
		position: relative;
		border: 1px solid #e3eaf3;
		border-left: 3px solid var(--event-color);
		background: var(--event-tint);
		border-radius: 0 9px 9px 0;
		padding: 13px 15px;
		overflow-wrap: anywhere;
	}
	.booking {
		--event-color: #0f766e;
		--event-tint: #f3f9f8;
		border-color: #deebe8;
		border-left-color: var(--event-color);
		padding: 11px 14px;
	}
	.all-day {
		--event-color: #6941a5;
		--event-tint: #f8f6fc;
		border-color: #eae4f2;
		border-left-color: var(--event-color);
	}
	.ongoing {
		--event-color: #217348;
		--event-tint: #f1f9f3;
		border-color: #d9eade;
		border-left-color: var(--event-color);
	}
	.ended {
		--event-color: #667085;
		--event-tint: #fafbfc;
		border-color: #e8ebef;
		border-left-color: #c3cbd5;
	}
	.event-card {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		column-gap: 12px;
		row-gap: 5px;
		align-items: center;
		padding: 8px 12px;
		min-height: 48px;
	}
	h4 {
		grid-column: 1;
		grid-row: 1;
		min-width: 0;
		margin: 0;
		color: var(--sc-ink);
		font-size: 0.9rem;
		font-weight: 650;
		line-height: 1.45;
	}
	.ended h4 {
		color: #4b5565;
	}
	.event-meta {
		grid-column: 2;
		grid-row: 1;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-end;
		max-width: 190px;
		gap: 4px 8px;
		font-size: 0.75rem;
		line-height: 1.5;
		text-align: right;
	}
	.has-details {
		grid-template-columns: minmax(0, 1fr) auto 44px;
		cursor: pointer;
	}
	.has-details:hover {
		border-color: var(--event-color);
	}
	.details-toggle {
		grid-column: 3;
		grid-row: 1;
		align-self: center;
	}
	.event-time {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--event-color);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.end-date {
		color: #596579;
	}
	.status {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 0.72rem;
		font-weight: 600;
		white-space: nowrap;
	}
	.live {
		background: #e1f1e5;
		color: #21613d;
		border-radius: 20px;
		padding: 4px 7px;
	}
	.past {
		color: #667085;
	}
	.event-location,
	.continuation {
		grid-column: 1 / 3;
		display: flex;
		align-items: flex-start;
		gap: 6px;
		margin: 0;
		color: #586577;
		font-size: 0.75rem;
		line-height: 1.5;
	}
	.event-location :global(svg),
	.continuation :global(svg) {
		flex-shrink: 0;
		margin-top: 2px;
	}
	.event-location {
		position: relative;
		z-index: 1;
		width: fit-content;
		max-width: 100%;
		cursor: pointer;
		text-decoration: underline;
		text-decoration-color: #aab4c2;
		text-underline-offset: 3px;
	}
	.event-location:hover {
		color: var(--event-color);
		text-decoration-color: currentColor;
	}
	.event-location:focus-visible {
		outline: 2px solid var(--sc-accent);
		outline-offset: 3px;
		border-radius: 2px;
	}
	.continuation {
		font-size: 0.7rem;
		color: #667085;
	}
	.event-card .details-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 3px;
		width: 44px;
		min-height: 44px;
		padding: 0;
		margin: -13px -6px -13px 0;
		color: #586577;
		border: 0;
		background: transparent;
		border-radius: 6px;
		cursor: pointer;
	}
	.event-card .details-toggle:hover:not(:disabled) {
		background: transparent;
		color: var(--event-color);
	}
	/* Stretch the native disclosure button across the card while links stay separate. */
	.details-toggle::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
	}
	.details-toggle :global(.rotated) {
		transform: rotate(180deg);
	}
	.description {
		position: relative;
		z-index: 1;
		cursor: text;
		grid-column: 1 / -1;
		border-top: 1px solid var(--sc-border);
		padding: 10px 0 2px;
		margin: 4px 0 0;
		white-space: pre-wrap;
		font-size: 0.8rem;
		line-height: 1.7;
		color: #475467;
	}
	.description :global(p),
	.description :global(div),
	.description :global(ul),
	.description :global(ol),
	.description :global(blockquote) {
		margin: 0 0 0.65em;
		white-space: normal;
	}
	.description :global(ul),
	.description :global(ol) {
		padding-left: 1.5em;
	}
	.description :global(ul) {
		list-style-type: disc;
	}
	.description :global(ol) {
		list-style-type: decimal;
	}
	.description :global(li + li) {
		margin-top: 0.2em;
	}
	.description :global(a) {
		cursor: pointer;
		color: #245da8;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.description :global(a:focus-visible) {
		outline: 2px solid var(--sc-accent);
		outline-offset: 2px;
	}
	.description :global(blockquote) {
		border-left: 2px solid #c3cbd5;
		padding-left: 12px;
	}
	.description :global(h1),
	.description :global(h2),
	.description :global(h3),
	.description :global(h4),
	.description :global(h5),
	.description :global(h6) {
		font-size: 1em;
		font-weight: 650;
		margin: 0.75em 0 0.35em;
	}
	.description :global(pre) {
		white-space: pre-wrap;
	}
	.description :global(> :last-child) {
		margin-bottom: 0;
	}
	.details-toggle:focus-visible {
		outline: none;
	}
	.details-toggle:focus-visible::after {
		outline: 2px solid var(--sc-accent);
		outline-offset: 2px;
	}
	@container bookings (max-width: 359px) {
		.event-card {
			grid-template-columns: minmax(0, 1fr);
			padding: 9px 11px;
		}
		.has-details {
			grid-template-columns: minmax(0, 1fr) 36px;
		}
		h4 {
			grid-column: 1;
			font-size: 0.87rem;
		}
		.event-meta {
			grid-column: 1;
			grid-row: 2;
			justify-content: flex-start;
			text-align: left;
		}
		.event-location,
		.continuation {
			grid-column: 1 / -1;
		}
		.details-toggle {
			grid-column: 2;
			grid-row: 2;
		}
	}
</style>

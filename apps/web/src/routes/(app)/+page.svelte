<script lang="ts">
	import { resolve } from '$app/paths';
	import { IframeEmbed } from '$lib';
	import { eventsCalendarUrl, headquartersCalendarUrl } from '$lib/calendars';

	const eventsAgendaUrl = `${eventsCalendarUrl}&mode=AGENDA&showTitle=0&showPrint=0&showCalendars=0&hl=ro`;
	const headquartersWidgetUrl = `${headquartersCalendarUrl}&showTitle=0&showPrint=0&showCalendars=0&hl=ro`;
</script>

<svelte:head>
	<title>Dashboard | Scouts Cluj Utilities</title>
</svelte:head>

<details class="calendars" open>
	<summary>Calendare</summary>
	<div class="calendar-grid">
		<section class="calendar-widget" aria-labelledby="events-heading">
			<header>
				<h2 id="events-heading">Următoarele evenimente</h2>
				<a href={resolve('/info/calendar')} aria-label="Deschide calendarul complet de evenimente">
					Calendar complet
				</a>
			</header>
			<div class="calendar-frame">
				<IframeEmbed
					url={eventsAgendaUrl}
					title="Următoarele evenimente"
					height="100%"
					loading="eager"
				/>
			</div>
		</section>

		<section class="calendar-widget headquarters-widget" aria-labelledby="headquarters-heading">
			<header>
				<h2 id="headquarters-heading">Calendar Sediu</h2>
				<a href={resolve('/sediu/orar')} aria-label="Deschide calendarul complet al sediului">
					Calendar complet
				</a>
			</header>
			<div class="calendar-frame">
				<IframeEmbed url={headquartersWidgetUrl} title="Calendar Sediu" height="100%" />
			</div>
		</section>
	</div>
</details>

<style>
	.calendars > summary {
		min-height: 44px;
		border: 1px solid #d8dee6;
		border-radius: 8px;
		background: #ffffff;
		padding: 12px 16px;
		color: #0f172a;
		font-weight: 800;
		cursor: pointer;
	}

	.calendars > summary:hover {
		background: #f8fafc;
	}

	.calendars > summary:focus-visible {
		outline: 2px solid #991b1b;
		outline-offset: 4px;
	}

	.calendars[open] > summary {
		margin-bottom: 16px;
	}

	.calendar-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 16px;
	}

	.calendar-widget {
		display: flex;
		flex-direction: column;
		min-width: 0;
		height: max(360px, calc(100svh - 176px));
		border: 1px solid #d8dee6;
		border-radius: 8px;
		background: #ffffff;
		overflow: hidden;
	}

	.headquarters-widget {
		display: none;
	}

	header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 4px 12px;
		border-bottom: 1px solid #d8dee6;
		padding: 12px 16px;
	}

	h2 {
		margin: 0;
		color: #0f172a;
		font-size: 1rem;
		font-weight: 800;
	}

	a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		color: #991b1b;
		font-size: 0.85rem;
		font-weight: 700;
		text-underline-offset: 3px;
	}

	a:hover {
		color: #7f1d1d;
	}

	a:focus-visible {
		outline: 2px solid #991b1b;
		outline-offset: 4px;
		border-radius: 2px;
	}

	.calendar-frame {
		flex: 1;
		min-height: 0;
	}

	@media (min-width: 900px) {
		.calendar-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.calendar-widget {
			height: max(560px, calc(100svh - 176px));
		}

		.headquarters-widget {
			display: flex;
		}
	}
</style>

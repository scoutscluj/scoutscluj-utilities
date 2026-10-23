<script lang="ts">
	import { monthLabel } from './calendar';
	let {
		day,
		endDay,
		current = false,
		year
	}: { day: string; endDay?: string; current?: boolean; year?: string } = $props();
	const dates = $derived(endDay && endDay > day ? [day, endDay] : [day]);
	const weekday = (date: string) =>
		new Intl.DateTimeFormat('ro-RO', { weekday: 'short', timeZone: 'UTC' })
			.format(new Date(`${date}T12:00Z`))
			.replace('.', '');
</script>

<div class="date-rail" aria-hidden="true">
	{#each dates as date, index (date)}
		{#if index > 0}<span class="date-connector"></span>{/if}
		<div class={['date-badge', { current: current && date === day }]}>
			<span class="month">{monthLabel(date)}</span>
			<strong>{Number(date.slice(8))}</strong>
			<small>{current && date === day ? 'Astăzi' : weekday(date)}</small>
			{#if year || date.slice(0, 4) !== day.slice(0, 4)}
				<span class="year">{date.slice(0, 4)}</span>
			{/if}
		</div>
	{/each}
</div>

<style>
	.date-rail {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 44px;
	}
	.date-connector {
		width: 2px;
		height: 12px;
		background: #c3cbd5;
	}

	.date-badge {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 44px;
		min-height: 48px;
		border: 1px solid #e0e5eb;
		border-radius: 7px;
		background: #fff;
		color: #344054;
		overflow: hidden;
		font-variant-numeric: tabular-nums;
	}
	.month {
		align-self: stretch;
		background: #f0f2f5;
		color: #586577;
		text-align: center;
		font-size: 0.56rem;
		font-weight: 650;
		line-height: 13px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	strong {
		margin-top: 2px;
		font-size: 1.15rem;
		line-height: 20px;
		font-weight: 650;
		letter-spacing: -0.03em;
	}
	small {
		padding-bottom: 2px;
		color: #667085;
		font-size: 0.58rem;
		line-height: 11px;
	}
	.year {
		color: #667085;
		font-size: 0.55rem;
		line-height: 10px;
		padding-bottom: 2px;
	}
	.current {
		color: #0f766e;
		border-color: #9ccfbd;
		background: #f5fbf8;
	}
	.current .month {
		color: #fff;
		background: #0f766e;
	}
	.current small {
		color: #0f766e;
		font-weight: 600;
	}
</style>

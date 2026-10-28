<script lang="ts">
	import { tick, untrack } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { Calendar, Popover } from 'bits-ui';
	import { parseDate, type DateValue } from '@internationalized/date';
	import CalendarIcon from '@lucide/svelte/icons/calendar-days';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { displayDate, parseLocalDate } from './local-date';
	let {
		value = $bindable(''),
		name,
		type = 'date',
		min,
		max,
		required,
		disabled,
		readonly,
		oninput,
		onchange,
		onValueChange,
		...rest
	}: Omit<HTMLInputAttributes, 'value' | 'type' | 'min' | 'max'> & {
		value?: string | number | null;
		type?: 'date' | 'datetime-local';
		min?: string;
		max?: string;
		onValueChange?: (value: string) => void;
	} = $props();
	const withTime = $derived(type === 'datetime-local');
	let text = $state(untrack(() => displayDate(value, type === 'datetime-local')));
	let lastValue = $state(untrack(() => value));
	let input = $state<HTMLInputElement>();
	let open = $state(false);
	const resetValue = untrack(() => value);
	$effect(() => {
		const form = input?.form;
		const reset = () => {
			value = resetValue;
			lastValue = value;
			text = displayDate(value, withTime);
		};
		form?.addEventListener('reset', reset);
		return () => form?.removeEventListener('reset', reset);
	});
	function calendarDate(date: string | number | null | undefined) {
		try {
			return date ? parseDate(String(date).slice(0, 10)) : undefined;
		} catch {
			return undefined;
		}
	}
	const selected = $derived(calendarDate(value));
	function validate() {
		const parsed = parseLocalDate(text, withTime);
		input?.setCustomValidity(
			parsed === null
				? `Folosește formatul ${withTime ? 'zz.ll.aaaa oo:mm' : 'zz.ll.aaaa'} și o dată validă.`
				: parsed && min && parsed < min
					? `Alege o dată începând cu ${displayDate(min, withTime)}.`
					: parsed && max && parsed > max
						? `Alege o dată până la ${displayDate(max, withTime)}.`
						: ''
		);
	}
	$effect(() => {
		if (value !== lastValue) {
			text = displayDate(value, withTime);
			lastValue = value;
		}
		validate();
	});
	function edit(event: Event) {
		text = (event.currentTarget as HTMLInputElement).value;
		const parsed = parseLocalDate(text, withTime);
		value = parsed ?? '';
		lastValue = value;
		validate();
		onValueChange?.(String(value));
		oninput?.(event as InputEvent & { currentTarget: EventTarget & HTMLInputElement });
	}
	async function pick(date: DateValue | undefined) {
		if (!date) return;
		value = date.toString() + (withTime ? `T${String(value ?? '').slice(11, 16) || '00:00'}` : '');
		text = displayDate(value, withTime);
		lastValue = value;
		open = false;
		validate();
		await tick();
		input?.dispatchEvent(new Event('input', { bubbles: true }));
		input?.dispatchEvent(new Event('change', { bubbles: true }));
	}
</script>

<span class="date-control">
	<input
		{...rest}
		type="text"
		bind:this={input}
		bind:value={text}
		{required}
		{disabled}
		{readonly}
		placeholder={withTime ? 'zz.ll.aaaa oo:mm' : 'zz.ll.aaaa'}
		inputmode={withTime ? 'text' : 'decimal'}
		autocomplete="off"
		oninput={edit}
		{onchange}
	/>
	{#if name}<input type="hidden" {name} value={value ?? ''} {disabled} />{/if}
	{#if !readonly}<Popover.Root bind:open>
			<Popover.Trigger class="date-trigger" {disabled} aria-label="Alege data din calendar"
				><CalendarIcon size={18} /></Popover.Trigger
			>
			<Popover.Portal
				><Popover.Content class="date-popover" sideOffset={6}>
					<Calendar.Root
						type="single"
						locale="ro-RO"
						weekStartsOn={1}
						value={selected}
						onValueChange={pick}
						minValue={calendarDate(min)}
						maxValue={calendarDate(max)}
						calendarLabel="Alege data"
						initialFocus
					>
						{#snippet children({ months, weekdays })}
							<Calendar.Header class="date-calendar-heading">
								<Calendar.PrevButton class="date-nav" aria-label="Luna precedentă"
									><ChevronLeft size={18} /></Calendar.PrevButton
								>
								<Calendar.MonthSelect aria-label="Luna" /><Calendar.YearSelect
									aria-label="Anul"
									years={Array.from({ length: 201 }, (_, i) => 1900 + i)}
								/>
								<Calendar.NextButton class="date-nav" aria-label="Luna următoare"
									><ChevronRight size={18} /></Calendar.NextButton
								>
							</Calendar.Header>
							{#each months as month (month.value.toString())}<Calendar.Grid>
									<Calendar.GridHead
										><Calendar.GridRow
											>{#each weekdays as day, i (i)}<Calendar.HeadCell>{day}</Calendar.HeadCell
												>{/each}</Calendar.GridRow
										></Calendar.GridHead
									>
									<Calendar.GridBody
										>{#each month.weeks as week, i (i)}<Calendar.GridRow
												>{#each week as date (date.toString())}<Calendar.Cell
														{date}
														month={month.value}
														><Calendar.Day class="date-day">{date.day}</Calendar.Day></Calendar.Cell
													>{/each}</Calendar.GridRow
											>{/each}</Calendar.GridBody
									>
								</Calendar.Grid>{/each}
						{/snippet}
					</Calendar.Root>
				</Popover.Content></Popover.Portal
			>
		</Popover.Root>{/if}
</span>

<style>
	.date-control {
		display: flex;
		align-items: stretch;
		width: 100%;
		min-width: 0;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		background: var(--sc-surface);
	}
	.date-control:focus-within {
		outline: 2px solid var(--sc-accent);
		outline-offset: 2px;
	}
	.date-control input[type='text'] {
		width: 100%;
		min-width: 0;
		min-height: 38px;
		padding: 10px;
		border: 0;
		border-radius: 7px;
		background: transparent;
		color: var(--sc-ink);
		font: inherit;
		font-variant-numeric: tabular-nums;
		outline: none;
	}
	.date-control input:disabled {
		opacity: 0.6;
	}
	:global(.date-trigger),
	:global(.date-nav) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		min-width: 38px;
		min-height: 38px;
		padding: 6px;
		border: 0;
		border-radius: 7px;
		background: transparent;
		color: var(--sc-muted);
		cursor: pointer;
	}
	:global(.date-trigger:hover),
	:global(.date-nav:hover) {
		background: var(--sc-canvas);
	}
	:global(.date-popover) {
		z-index: 160;
		max-width: calc(100vw - 32px);
		padding: 12px;
		border: 1px solid var(--sc-border);
		border-radius: 10px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		box-shadow: var(--sc-shadow, 0 8px 24px #0002);
		font: inherit;
	}
	:global(.date-calendar-heading) {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-bottom: 8px;
	}
	:global(.date-calendar-heading select) {
		min-height: 36px;
		max-width: 112px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		padding: 4px;
		font: inherit;
	}
	:global(.date-popover table) {
		border-collapse: collapse;
		width: 100%;
	}
	:global(.date-popover th) {
		font-size: 12px;
		font-weight: 500;
		color: var(--sc-muted);
		height: 28px;
	}
	:global(.date-popover td) {
		padding: 0;
		text-align: center;
	}
	:global(.date-day) {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 0;
		border-radius: 7px;
		font-size: 14px;
		cursor: pointer;
	}
	:global(.date-day:hover) {
		background: var(--sc-canvas);
	}
	:global(.date-day[data-selected]) {
		background: var(--sc-accent);
		color: white;
	}
	:global(.date-day[data-disabled]),
	:global(.date-day[data-outside-month]) {
		opacity: 0.35;
	}
	:global(.date-day:focus-visible),
	:global(.date-trigger:focus-visible),
	:global(.date-nav:focus-visible) {
		outline: 2px solid var(--sc-accent);
		outline-offset: 2px;
	}
</style>

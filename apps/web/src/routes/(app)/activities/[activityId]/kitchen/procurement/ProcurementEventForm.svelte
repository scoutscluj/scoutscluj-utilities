<script lang="ts">
	import type {
		KitchenProcurementEvent,
		ProcurementMethod,
		ProcurementStatus
	} from '../kitchen-api';

	let { event }: { event?: KitchenProcurementEvent } = $props();

	const methodOptions: Array<{ value: ProcurementMethod; label: string }> = [
		{ value: 'self_purchase', label: 'Cumpărare directă' },
		{ value: 'shopping_run', label: 'Tură de cumpărături' },
		{ value: 'delivery', label: 'Livrare' },
		{ value: 'supplier_order', label: 'Comandă furnizor' },
		{ value: 'local_center', label: 'Centru local' },
		{ value: 'person', label: 'Adus de cineva' }
	];

	const statusOptions: Array<{ value: ProcurementStatus; label: string }> = [
		{ value: 'planned', label: 'Planificat' },
		{ value: 'in_progress', label: 'În lucru' },
		{ value: 'completed', label: 'Finalizat' }
	];

	const dateValue = (value?: string) => value?.slice(0, 10) ?? '';
</script>

<form class="event-form" method="POST" action={event ? '?/updateEvent' : '?/createEvent'}>
	{#if event}
		<input type="hidden" name="eventId" value={event.id} />
	{/if}
	<label>
		<span>Nume</span>
		<input name="name" value={event?.name ?? ''} required />
	</label>
	<label>
		<span>Furnizor</span>
		<input name="supplier" value={event?.supplier ?? ''} />
	</label>
	<label>
		<span>Responsabil</span>
		<input name="ownerName" value={event?.ownerName ?? ''} />
	</label>
	<label>
		<span>Dată</span>
		<input name="date" type="date" value={dateValue(event?.date)} />
	</label>
	<label>
		<span>Metodă</span>
		<select name="method">
			{#each methodOptions as option (option.value)}
				<option
					value={option.value}
					selected={event ? event.method === option.value : option.value === 'self_purchase'}
				>
					{option.label}
				</option>
			{/each}
		</select>
	</label>
	<label>
		<span>Status</span>
		<select name="status">
			{#each statusOptions as option (option.value)}
				<option
					value={option.value}
					selected={event ? event.status === option.value : option.value === 'planned'}
				>
					{option.label}
				</option>
			{/each}
		</select>
	</label>
	<label class="wide">
		<span>Notițe</span>
		<input name="notes" value={event?.notes ?? ''} />
	</label>
	<button type="submit">{event ? 'Salvează' : 'Adaugă'}</button>
</form>

<style>
	.event-form {
		display: grid;
		grid-template-columns: repeat(6, minmax(120px, 1fr));
		gap: 10px;
		align-items: end;
	}

	.event-form .wide {
		grid-column: span 4;
	}

	label {
		display: grid;
		gap: 6px;
		color: #334155;
		font-size: 0.84rem;
		font-weight: 800;
	}

	input,
	select {
		width: 100%;
		min-width: 0;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 9px 10px;
		font: inherit;
	}

	button {
		min-height: 38px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 0;
		border-radius: 8px;
		background: #0f766e;
		color: #ffffff;
		padding: 0 12px;
		font-weight: 800;
		cursor: pointer;
	}

	@media (max-width: 1100px) {
		.event-form {
			grid-template-columns: 1fr;
		}

		.event-form .wide {
			grid-column: auto;
		}
	}
</style>

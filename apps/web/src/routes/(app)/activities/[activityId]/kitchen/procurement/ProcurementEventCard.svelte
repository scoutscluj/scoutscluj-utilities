<script lang="ts">
	import { resolve } from '$app/paths';
	import type {
		FinancialDocument,
		KitchenIngredient,
		KitchenProcurementEvent
	} from '../kitchen-api';
	import ProcurementDocumentsSection from './ProcurementDocumentsSection.svelte';
	import ProcurementEventForm from './ProcurementEventForm.svelte';
	import ProcurementItemsSection from './ProcurementItemsSection.svelte';

	let {
		activityId,
		documents,
		event,
		ingredients
	}: {
		activityId: number;
		documents: FinancialDocument[];
		event: KitchenProcurementEvent;
		ingredients: KitchenIngredient[];
	} = $props();

	const methodLabels = {
		self_purchase: 'Cumpărare directă',
		shopping_run: 'Tură de cumpărături',
		delivery: 'Livrare',
		supplier_order: 'Comandă furnizor',
		local_center: 'Centru local',
		person: 'Adus de cineva'
	};

	const statusLabels = {
		planned: 'Planificat',
		in_progress: 'În lucru',
		completed: 'Finalizat'
	};

	const formatDate = (value?: string) =>
		value
			? new Intl.DateTimeFormat('ro-RO', { dateStyle: 'medium' }).format(new Date(value))
			: 'Fără dată';
</script>

<article class="panel event-card">
	<div class="event-heading">
		<div>
			<p class="eyebrow">Aprovizionare</p>
			<h2>{event.name}</h2>
			<p class="muted">
				{event.supplier ?? 'Fără furnizor'} · {event.ownerName ?? 'fără responsabil'} ·
				{formatDate(event.date)} · {methodLabels[event.method]}
			</p>
		</div>
		<div class={`status ${event.status}`}>{statusLabels[event.status]}</div>
	</div>

	<ProcurementEventForm {event} />

	<div class="event-actions">
		<form method="POST" action="?/addRemaining">
			<input type="hidden" name="eventId" value={event.id} />
			<button class="secondary" type="submit">Adaugă rămasul</button>
		</form>
		<a href={resolve(`/activities/${activityId}/kitchen/procurement/${event.id}/export.csv`)}>
			Export CSV
		</a>
		<form method="POST" action="?/deleteEvent">
			<input type="hidden" name="eventId" value={event.id} />
			<button class="danger" type="submit">Șterge</button>
		</form>
	</div>

	<ProcurementItemsSection {event} {ingredients} />
	<ProcurementDocumentsSection {event} {documents} />
</article>

<style>
	.panel,
	.event-card {
		display: grid;
		gap: 16px;
	}

	.panel {
		border: 1px solid #dbe3ef;
		background: #ffffff;
		border-radius: 8px;
		padding: 18px;
		box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
	}

	.event-heading,
	.event-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
		justify-content: space-between;
	}

	.event-actions {
		justify-content: flex-start;
	}

	.event-actions a,
	button {
		min-height: 38px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		padding: 0 12px;
		font-weight: 800;
		text-decoration: none;
	}

	button {
		border: 0;
		background: #0f766e;
		color: #ffffff;
		cursor: pointer;
	}

	.event-actions a,
	.secondary {
		border: 1px solid #cbd5e1;
		background: #ffffff;
		color: #334155;
	}

	.danger {
		border: 1px solid #fecaca;
		background: #ffffff;
		color: #991b1b;
	}

	.status {
		border-radius: 999px;
		padding: 6px 10px;
		background: #eef2ff;
		color: #3730a3;
		font-size: 0.8rem;
		font-weight: 900;
	}

	.status.completed {
		background: #dcfce7;
		color: #166534;
	}

	.status.in_progress {
		background: #fef3c7;
		color: #92400e;
	}

	h2,
	p {
		margin: 0;
	}

	h2 {
		color: #0f172a;
	}

	.muted {
		color: #64748b;
	}

	.eyebrow {
		margin: 0 0 8px;
		color: #2563eb;
		font-size: 0.78rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0;
	}
</style>

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

	<details class="event-details">
		<summary>Detalii aprovizionare · modifică</summary><ProcurementEventForm {event} />
	</details>

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
		border: 1px solid var(--sc-border);
		background: var(--sc-surface);
		border-radius: 8px;
		padding: 18px;
		box-shadow: var(--sc-shadow);
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
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		padding: 0 12px;
		font-weight: 600;
		text-decoration: none;
	}

	button {
		border: 0;
		background: var(--sc-accent);
		color: var(--sc-on-accent);
		cursor: pointer;
	}

	.event-actions a,
	.secondary {
		border: 1px solid var(--sc-border-strong);
		background: var(--sc-surface);
		color: var(--sc-ink);
	}

	.danger {
		border: 1px solid var(--sc-border-strong);
		background: var(--sc-surface);
		color: var(--sc-link);
	}

	.status {
		border-radius: 999px;
		padding: 6px 10px;
		background: var(--sc-info-soft);
		color: var(--sc-info);
		font-size: 0.8rem;
		font-weight: 600;
	}

	.status.completed {
		background: var(--sc-success-soft);
		color: var(--sc-success);
	}

	.status.in_progress {
		background: var(--sc-warning-soft);
		color: var(--sc-warning);
	}

	h2,
	p {
		margin: 0;
	}

	h2 {
		color: var(--sc-ink);
	}

	.muted {
		color: var(--sc-muted);
	}

	.eyebrow {
		margin: 0 0 8px;
		color: var(--sc-muted);
		font-size: 0.78rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0;
	}

	input:not([type='hidden']):not([type='checkbox']):not([type='radio']) {
		background: var(--sc-inset);
		color: var(--sc-ink);
		border-color: var(--sc-control-border);
	}

	.event-details summary {
		min-height: 44px;
		align-content: center;
		cursor: pointer;
		color: var(--sc-link);
	}
</style>

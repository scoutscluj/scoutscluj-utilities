import type { AuditEntry, AuditEntryDisplay, AuditMetadataRow } from './audit-entry';
import { actionTitles, entityLabels, fieldLabels, fieldValueLabels } from './audit-vocabulary';

const formatNumber = (value: number) =>
	new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 2 }).format(value);

const humanizeKey = (key: string) =>
	key
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/_/g, ' ')
		.replace(/^./, (letter) => letter.toUpperCase());

const labelForValue = (key: string, value: unknown) =>
	typeof value === 'string' ? (fieldValueLabels[key]?.[value] ?? value) : undefined;

const valueText = (value: unknown, key = ''): string => {
	const labeled = labelForValue(key, value);
	if (labeled) return labeled;
	if (value === undefined || value === null || value === '') return '-';
	if (typeof value === 'number') return formatNumber(value);
	if (typeof value === 'boolean') return value ? 'Da' : 'Nu';
	if (Array.isArray(value)) {
		return value.length ? value.map((item) => valueText(item)).join(', ') : 'niciuna';
	}
	if (typeof value === 'object') return JSON.stringify(value);
	return String(value);
};

const metadataRows = (metadata: Record<string, unknown>): AuditMetadataRow[] =>
	Object.entries(metadata).map(([key, value]) => ({
		label: fieldLabels[key] ?? humanizeKey(key),
		value: valueText(value, key)
	}));

const metadataText = (metadata: Record<string, unknown>, key: string) =>
	valueText(metadata[key], key);

const changedFields = (metadata: Record<string, unknown>) => {
	const fields = metadata.changedFields;
	if (!Array.isArray(fields) || !fields.length) return undefined;
	return fields.map((field) => fieldLabels[String(field)] ?? humanizeKey(String(field))).join(', ');
};

const withName = (metadata: Record<string, unknown>, fallback: string) =>
	typeof metadata.name === 'string' && metadata.name.trim() ? metadata.name.trim() : fallback;

const mealSummary = (metadata: Record<string, unknown>) => {
	const slot = metadataText(metadata, 'slot');
	const name = typeof metadata.name === 'string' ? metadata.name.trim() : '';
	const context = typeof metadata.context === 'string' ? metadata.context.trim() : '';
	const details = [name, context].filter(Boolean).join(' - ');
	return details ? `${slot}: ${details}.` : `${slot} a fost salvată.`;
};

const summaryFor = (entry: AuditEntry, entityLabel: string) => {
	const metadata = entry.metadata ?? {};
	const namedEntity = withName(metadata, entityLabel);

	switch (entry.action) {
		case 'activity.settings_updated':
			return changedFields(metadata)
				? `Au fost modificate: ${changedFields(metadata)}.`
				: 'Setările activității au fost actualizate.';
		case 'financial_document.created':
			return `${metadataText(metadata, 'originalFilename')} a fost încărcat cu status ${metadataText(metadata, 'status')}.`;
		case 'financial_document.status_updated':
			return `Status schimbat din ${metadataText(metadata, 'fromStatus')} în ${metadataText(metadata, 'toStatus')}.`;
		case 'kitchen_plan.created':
		case 'kitchen_plan.updated':
			return `Participanți implicați: ${metadataText(metadata, 'defaultParticipantCount')}.`;
		case 'kitchen_days.synced':
			return `${metadataText(metadata, 'added')} zile adăugate, ${metadataText(metadata, 'markedOutside')} marcate în afara intervalului.`;
		case 'kitchen_ingredient.created':
		case 'kitchen_ingredient.updated':
		case 'kitchen_recipe.created':
		case 'kitchen_recipe.updated':
		case 'kitchen_procurement_event.created':
		case 'kitchen_procurement_event.updated':
			return `${namedEntity} a fost salvat.`;
		case 'kitchen_meal.created':
		case 'kitchen_meal.updated':
			return mealSummary(metadata);
		case 'kitchen_meal.deleted':
			return 'Masa a fost ștearsă din plan.';
		case 'kitchen_meal_recipe.assigned':
			return `Rețeta #${metadataText(metadata, 'recipeId')} a fost adăugată la masa #${metadataText(metadata, 'mealId')}.`;
		case 'kitchen_meal_recipe.refreshed':
			return 'Snapshotul rețetei folosite la masă a fost actualizat.';
		case 'kitchen_meal_recipe.removed':
			return 'Rețeta a fost scoasă din masa planificată.';
		case 'kitchen_meal_attendance.replaced':
			return `Prezența pentru masa #${metadataText(metadata, 'mealId')} a fost înlocuită.`;
		case 'kitchen_quantity_adjustment.created':
		case 'kitchen_quantity_adjustment.deleted':
			return `Ajustare pentru ingredientul #${metadataText(metadata, 'ingredientId')} la masa #${metadataText(metadata, 'mealId')}.`;
		case 'kitchen_procurement_event.deleted':
			return 'Aprovizionarea a fost ștearsă.';
		case 'kitchen_procurement_item.created':
		case 'kitchen_procurement_item.updated':
		case 'kitchen_procurement_item.deleted':
			return `Ingredientul #${metadataText(metadata, 'ingredientId')} a fost actualizat în aprovizionare.`;
		case 'kitchen_procurement_items.added_from_meal_plan':
			return 'Ingrediente au fost adăugate din necesarul meselor.';
		case 'kitchen_procurement_document.linked':
			return `Documentul financiar #${metadataText(metadata, 'financialDocumentId')} a fost atașat aprovizionării.`;
		default:
			return `A fost înregistrată o acțiune pentru ${entityLabel}.`;
	}
};

export const formatAuditEntry = (entry: AuditEntry): AuditEntryDisplay => {
	const metadata = entry.metadata ?? {};
	const entityName = entityLabels[entry.entityType] ?? humanizeKey(entry.entityType);
	const entityLabel = `${entityName} #${entry.entityId}`;

	return {
		title: actionTitles[entry.action] ?? humanizeKey(entry.action),
		summary: summaryFor(entry, entityLabel),
		entityLabel,
		metadataRows: metadataRows(metadata),
		rawDetails: JSON.stringify(metadata, null, 2)
	};
};

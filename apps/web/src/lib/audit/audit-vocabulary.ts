export const actionTitles: Record<string, string> = {
	'activity.settings_updated': 'Setări activitate actualizate',
	'financial_document.created': 'Document financiar încărcat',
	'financial_document.status_updated': 'Status document financiar schimbat',
	'kitchen_days.synced': 'Zile de bucătărie sincronizate',
	'kitchen_ingredient.created': 'Ingredient creat',
	'kitchen_ingredient.updated': 'Ingredient actualizat',
	'kitchen_meal.created': 'Masă creată',
	'kitchen_meal.deleted': 'Masă ștearsă',
	'kitchen_meal.updated': 'Masă actualizată',
	'kitchen_meal_attendance.replaced': 'Prezență masă actualizată',
	'kitchen_meal_recipe.assigned': 'Rețetă adăugată la masă',
	'kitchen_meal_recipe.refreshed': 'Snapshot rețetă actualizat',
	'kitchen_meal_recipe.removed': 'Rețetă scoasă din masă',
	'kitchen_plan.created': 'Plan de bucătărie creat',
	'kitchen_plan.updated': 'Plan de bucătărie actualizat',
	'kitchen_procurement_document.linked': 'Document atașat la aprovizionare',
	'kitchen_procurement_event.created': 'Aprovizionare creată',
	'kitchen_procurement_event.deleted': 'Aprovizionare ștearsă',
	'kitchen_procurement_event.updated': 'Aprovizionare actualizată',
	'kitchen_procurement_item.created': 'Ingredient adăugat la aprovizionare',
	'kitchen_procurement_item.deleted': 'Ingredient scos din aprovizionare',
	'kitchen_procurement_item.updated': 'Ingredient de aprovizionare actualizat',
	'kitchen_procurement_items.added_from_meal_plan': 'Ingrediente adăugate din mese',
	'kitchen_quantity_adjustment.created': 'Ajustare de cantitate creată',
	'kitchen_quantity_adjustment.deleted': 'Ajustare de cantitate ștearsă',
	'kitchen_recipe.created': 'Rețetă creată',
	'kitchen_recipe.updated': 'Rețetă actualizată'
};

export const entityLabels: Record<string, string> = {
	activity: 'Activitate',
	financial_document: 'Document financiar',
	kitchen_ingredient: 'Ingredient',
	kitchen_meal: 'Masă',
	kitchen_meal_attendance: 'Prezență masă',
	kitchen_meal_recipe: 'Rețetă în masă',
	kitchen_plan: 'Plan de bucătărie',
	kitchen_procurement_document: 'Document de aprovizionare',
	kitchen_procurement_event: 'Aprovizionare',
	kitchen_procurement_item: 'Ingredient de aprovizionare',
	kitchen_quantity_adjustment: 'Ajustare cantitate',
	kitchen_recipe: 'Rețetă'
};

export const fieldLabels: Record<string, string> = {
	activityId: 'Activitate',
	added: 'Zile adăugate',
	after: 'După',
	before: 'Înainte',
	changedFields: 'Câmpuri schimbate',
	contentType: 'Tip fișier',
	context: 'Context',
	defaultParticipantCount: 'Participanți implicați',
	fileSize: 'Dimensiune fișier',
	financialDocumentId: 'Document financiar',
	fromStatus: 'Status anterior',
	ingredientId: 'Ingredient',
	markedOutside: 'Zile în afara intervalului',
	mealId: 'Masă',
	name: 'Nume',
	originalFilename: 'Fișier',
	procurementEventId: 'Aprovizionare',
	recipeId: 'Rețetă',
	reviewerNotes: 'Observații',
	slot: 'Tip masă',
	status: 'Status',
	toStatus: 'Status nou'
};

const statusLabels = {
	archived: 'Arhivat',
	completed: 'Finalizat',
	draft: 'Draft',
	in_progress: 'În lucru',
	in_review: 'Gata de trimis',
	needs_clarification: 'Necesită clarificări',
	planned: 'Planificat',
	ready_to_send: 'Gata de trimis',
	rejected: 'Respins',
	sent: 'Trimis',
	uploaded: 'Gata de trimis'
};

export const fieldValueLabels: Record<string, Record<string, string>> = {
	fromStatus: statusLabels,
	status: statusLabels,
	toStatus: statusLabels,
	slot: {
		breakfast: 'Mic dejun',
		dinner: 'Cină',
		lunch: 'Prânz',
		snack_1: 'Gustare 1',
		snack_2: 'Gustare 2'
	}
};

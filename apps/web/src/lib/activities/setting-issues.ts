import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { tick } from 'svelte';
import { fixedConsentLabels } from '@scouts-cluj/parental-consent-schema';
export async function focusSettingIssue(activityId: number, field: string) {
	const key = field.startsWith('consent.') ? field.slice(8) : '';
	if (!Object.hasOwn(fixedConsentLabels, key)) return;
	await goto(resolve(`/activities/${activityId}/settings/consent#consent-${key}`));
	await tick();
	const input = document.getElementById(`consent-${key}`);
	input?.scrollIntoView({ block: 'center', behavior: 'smooth' });
	input?.focus({ preventScroll: true });
}

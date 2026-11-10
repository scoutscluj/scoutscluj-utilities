import type { RequestEvent } from '@sveltejs/kit';
import { fail } from '@sveltejs/kit';
import { apiFetch } from './api';
import { memberHeaders } from './members';

export function applicationBody(form: FormData) {
	return {
		...Object.fromEntries(form),
		forChild: form.get('registrationFor') === 'other',
		keepPhoto: form.get('keepPhoto') === 'true',
		consent: form.get('consent') === 'on'
	};
}
export async function submitApplication(event: RequestEvent, admin = false) {
	const values = await event.request.formData();
	const response = await apiFetch('/api/member-applications' + (admin ? '/create' : ''), {
		method: 'POST',
		headers: { ...memberHeaders(event), 'Content-Type': 'application/json' },
		body: JSON.stringify(applicationBody(values))
	});
	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		return fail(response.status, {
			message: typeof error.message === 'string' ? error.message : 'Cererea nu a putut fi trimisă.',
			values: Object.fromEntries(values)
		});
	}
	const today = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Europe/Bucharest',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(new Date());
	return {
		received: true,
		message: 'Cererea a fost înregistrată și așteaptă validarea.',
		nextSteps: {
			subject:
				values.get('registrationFor') === 'self'
					? 'self'
					: String(values.get('birthDate') ?? '') >
						  `${Number(today.slice(0, 4)) - 18}${today.slice(4)}`
						? 'child'
						: 'other',
			hasMemberEmail: !!String(values.get('email') ?? '').trim()
		}
	};
}

import {
	parentalConsentResponse,
	readParentalConsentError
} from '$lib/server/parental-consent-api';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, params }) => {
	const response = await parentalConsentResponse(
		cookies,
		`/api/activities/${Number(params.activityId)}/parental-consent/preview/${params.branch}`
	);
	if (!response.ok) error(response.status, await readParentalConsentError(response));
	return new Response(response.body, { status: response.status, headers: response.headers });
};

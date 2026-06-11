import { env } from '$env/dynamic/public';

type ApiStatus =
	| {
			reachable: true;
			status: string;
			timestamp: string;
	  }
	| {
			reachable: false;
			error: string;
	  };

export const load = async ({ fetch }) => {
	const apiBaseUrl = env.PUBLIC_API_BASE_URL || 'http://localhost:3000';
	const healthUrl = `${apiBaseUrl}/api/health`;

	try {
		const response = await fetch(healthUrl);
		if (!response.ok) {
			return {
				apiBaseUrl,
				apiStatus: {
					reachable: false,
					error: `HTTP ${response.status}`
				} satisfies ApiStatus
			};
		}

		const data = (await response.json()) as { status?: string; timestamp?: string };

		return {
			apiBaseUrl,
			apiStatus: {
				reachable: true,
				status: data.status ?? 'unknown',
				timestamp: data.timestamp ?? ''
			} satisfies ApiStatus
		};
	} catch (error) {
		return {
			apiBaseUrl,
			apiStatus: {
				reachable: false,
				error: error instanceof Error ? error.message : 'Unknown API error'
			} satisfies ApiStatus
		};
	}
};

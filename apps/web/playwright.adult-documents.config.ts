import { defineConfig } from '@playwright/test';
import base from './playwright.membership.config';

process.env.MEMBERSHIP_TEST_API_URL = 'http://127.0.0.1:3018';

export default defineConfig({
	...base,
	testMatch: ['adult-documents.spec.ts', 'profile.spec.ts'],
	use: { ...base.use, baseURL: 'http://127.0.0.1:5185', channel: process.env.PLAYWRIGHT_CHANNEL },
	webServer: [
		{
			command: 'node e2e/fixtures/membership-api.mjs',
			port: 3018,
			reuseExistingServer: false,
			env: { MEMBERSHIP_TEST_API_PORT: '3018', MEMBERSHIP_TEST_WEB_ORIGIN: 'http://127.0.0.1:5185' }
		},
		{
			command: 'node build/index.js',
			port: 5185,
			reuseExistingServer: false,
			env: {
				PUBLIC_API_BASE_URL: 'http://127.0.0.1:3018',
				BODY_SIZE_LIMIT: '16M',
				HOST: '127.0.0.1',
				PORT: '5185',
				ORIGIN: 'http://127.0.0.1:5185'
			}
		}
	]
});

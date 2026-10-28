import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
	testDir: './e2e',
	testMatch: ['activity-registration.spec.ts', 'activity-publication.spec.ts'],
	workers: 1,
	timeout: 60000,
	use: {
		baseURL: 'http://127.0.0.1:5186',
		...devices['Desktop Chrome'],
		trace: 'retain-on-failure',
		channel: process.env.PLAYWRIGHT_CHANNEL
	},
	webServer: [
		{
			command: 'node e2e/fixtures/activity-registration-api.mjs',
			port: 3019,
			reuseExistingServer: false
		},
		{
			command: 'node build/index.js',
			port: 5186,
			reuseExistingServer: false,
			env: {
				PUBLIC_API_BASE_URL: 'http://127.0.0.1:3019',
				HOST: '127.0.0.1',
				PORT: '5186',
				ORIGIN: 'http://127.0.0.1:5186',
				BODY_SIZE_LIMIT: '16M'
			},
			timeout: 120000
		}
	]
});

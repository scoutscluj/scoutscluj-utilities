import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
	testDir: './e2e',
	testMatch: ['platform-appearance.spec.ts'],
	workers: 1,
	timeout: 300000,
	use: {
		baseURL: 'http://127.0.0.1:5190',
		...devices['Desktop Chrome'],
		channel: process.env.PLAYWRIGHT_CHANNEL,
		trace: 'retain-on-failure'
	},
	webServer: [
		{
			command: 'node e2e/fixtures/membership-api.mjs',
			port: 3018,
			reuseExistingServer: false,
			env: { MEMBERSHIP_TEST_API_PORT: '3018', MEMBERSHIP_TEST_WEB_ORIGIN: 'http://127.0.0.1:5190' }
		},
		{
			command: 'node e2e/fixtures/platform-appearance-api.mjs',
			port: 3030,
			reuseExistingServer: false
		},
		{
			command: 'node build/index.js',
			port: 5190,
			reuseExistingServer: false,
			timeout: 120000,
			env: {
				PUBLIC_API_BASE_URL: 'http://127.0.0.1:3030',
				HOST: '127.0.0.1',
				PORT: '5190',
				ORIGIN: 'http://127.0.0.1:5190'
			}
		}
	]
});

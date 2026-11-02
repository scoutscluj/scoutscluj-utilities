import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
	testDir: './e2e',
	testMatch: 'member-admissions.spec.ts',
	workers: 1,
	timeout: 60000,
	use: {
		baseURL: 'http://127.0.0.1:5197',
		...devices['Desktop Chrome'],
		trace: 'retain-on-failure',
		channel: process.env.PLAYWRIGHT_CHANNEL
	},
	webServer: [
		{
			command: 'node e2e/fixtures/member-admissions-api.mjs',
			port: 3027,
			reuseExistingServer: false
		},
		{
			command: 'node build/index.js',
			port: 5197,
			reuseExistingServer: false,
			timeout: 120000,
			env: {
				PUBLIC_API_BASE_URL: 'http://127.0.0.1:3027',
				HOST: '127.0.0.1',
				PORT: '5197',
				ORIGIN: 'http://127.0.0.1:5197'
			}
		}
	]
});

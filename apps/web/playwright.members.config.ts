import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
	testDir: './e2e',
	testMatch: ['member-responsibilities.spec.ts'],
	workers: 1,
	timeout: 30000,
	use: {
		baseURL: 'http://127.0.0.1:5187',
		...devices['Desktop Chrome'],
		trace: 'retain-on-failure',
		channel: process.env.PLAYWRIGHT_CHANNEL
	},
	webServer: [
		{
			command: 'node e2e/fixtures/member-assignment-api.mjs',
			port: 3020,
			reuseExistingServer: false
		},
		{
			command: 'node build/index.js',
			port: 5187,
			reuseExistingServer: false,
			env: {
				PUBLIC_API_BASE_URL: 'http://127.0.0.1:3020',
				HOST: '127.0.0.1',
				PORT: '5187',
				ORIGIN: 'http://127.0.0.1:5187'
			},
			timeout: 120000
		}
	]
});

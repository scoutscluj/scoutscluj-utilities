import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
	testDir: './e2e',
	testMatch: 'national-fees.spec.ts',
	workers: 1,
	timeout: 30000,
	use: {
		baseURL: 'http://127.0.0.1:5237',
		...devices['Desktop Chrome'],
		trace: 'retain-on-failure',
		channel: process.env.PLAYWRIGHT_CHANNEL
	},
	webServer: [
		{ command: 'node e2e/fixtures/national-fees-api.mjs', port: 3037, reuseExistingServer: false },
		{
			command: 'node build/index.js',
			port: 5237,
			reuseExistingServer: false,
			timeout: 120000,
			env: {
				PUBLIC_API_BASE_URL: 'http://127.0.0.1:3037',
				HOST: '127.0.0.1',
				PORT: '5237',
				ORIGIN: 'http://127.0.0.1:5237'
			}
		}
	]
});

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	testMatch: 'membership-finance.spec.ts',
	workers: 1,
	timeout: 120000,
	use: {
		baseURL: 'http://127.0.0.1:5182',
		trace: 'retain-on-failure',
		...devices['Desktop Chrome']
	},
	webServer: [
		{
			command: 'node e2e/fixtures/membership-api.mjs',
			port: 3015,
			reuseExistingServer: !process.env.CI
		},
		{
			command: 'node build/index.js',
			port: 5182,
			reuseExistingServer: !process.env.CI,
			env: {
				PUBLIC_API_BASE_URL: 'http://127.0.0.1:3015',
				HOST: '127.0.0.1',
				PORT: '5182',
				ORIGIN: 'http://127.0.0.1:5182'
			},
			timeout: 120000
		}
	]
});

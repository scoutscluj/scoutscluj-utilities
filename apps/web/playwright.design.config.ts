import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	workers: 1,
	timeout: 45000,
	use: {
		...devices['Desktop Chrome'],
		trace: 'retain-on-failure',
		channel: process.env.PLAYWRIGHT_CHANNEL
	},
	projects: [
		{
			name: 'activities-design',
			testMatch: ['responsive-activities.spec.ts'],
			use: { baseURL: 'http://127.0.0.1:5186' }
		},
		{
			name: 'members-design',
			testMatch: ['responsive-members.spec.ts'],
			use: { baseURL: 'http://127.0.0.1:5187' }
		}
	],
	webServer: [
		{
			command: 'node e2e/fixtures/activity-registration-api.mjs',
			port: 3019,
			reuseExistingServer: false
		},
		{
			command: 'node e2e/fixtures/member-assignment-api.mjs',
			port: 3020,
			reuseExistingServer: false
		},
		...[
			{ port: 5186, api: 'http://127.0.0.1:3019' },
			{ port: 5187, api: 'http://127.0.0.1:3020' }
		].map(({ port, api }) => ({
			command: 'node build/index.js',
			port,
			reuseExistingServer: false,
			timeout: 120000,
			env: {
				PUBLIC_API_BASE_URL: api,
				HOST: '127.0.0.1',
				PORT: String(port),
				ORIGIN: `http://127.0.0.1:${port}`,
				BODY_SIZE_LIMIT: '16M'
			}
		}))
	]
});

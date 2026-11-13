import { defineConfig } from '@playwright/test';
import base from './playwright.membership.config';

export default defineConfig({
	...base,
	testMatch: ['responsive-self-service.spec.ts'],
	timeout: 120000,
	use: { ...base.use, channel: process.env.PLAYWRIGHT_CHANNEL }
});

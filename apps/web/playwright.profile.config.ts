import { defineConfig } from '@playwright/test';
import base from './playwright.membership.config';

export default defineConfig({
	...base,
	testMatch: ['profile.spec.ts'],
	use: { ...base.use, channel: process.env.PLAYWRIGHT_CHANNEL }
});

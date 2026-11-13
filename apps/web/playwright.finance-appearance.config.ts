import { defineConfig } from '@playwright/test';
import membership from './playwright.membership.config';

export default defineConfig({
	...membership,
	testMatch: ['finance-appearance.spec.ts']
});

import { defineConfig } from '@playwright/test';
import calendarConfig from './playwright.calendars.config';
export default defineConfig({
	...calendarConfig,
	testMatch: ['calendar-appearance.spec.ts'],
	timeout: 120000
});

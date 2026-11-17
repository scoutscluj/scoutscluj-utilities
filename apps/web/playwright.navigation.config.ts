import { defineConfig } from '@playwright/test';
import base from './playwright.members.config';

export default defineConfig({ ...base, testMatch: ['navigation.spec.ts'] });

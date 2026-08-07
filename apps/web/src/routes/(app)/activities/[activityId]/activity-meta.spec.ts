import { describe, expect, it } from 'vitest';
import { filterActivityDepartments } from './activity-meta';

describe('filterActivityDepartments', () => {
	it('keeps the administrative department selected by the settings form', () => {
		expect(filterActivityDepartments(['finance', 'administrative', 'unknown'])).toEqual([
			'finance',
			'administrative'
		]);
	});
});

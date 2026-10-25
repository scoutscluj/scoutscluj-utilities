import { describe, expect, it } from 'vitest';
import { matchesSearch, searchRanges } from './table-search';

describe('table search matching and highlight offsets', () => {
	it('matches words irrespective of accents, case and order', () => {
		expect(matchesSearch('Ștefan Popescu · ID 123', 'POPESCU stefan')).toBe(true);
		expect(matchesSearch('Ștefan Popescu', 'stefan maria')).toBe(false);
		expect(matchesSearch('Orice rezultat', '   ')).toBe(true);
	});
	it('preserves original UTF-16 offsets and merges overlapping terms', () => {
		const text = '🏕️ Ștefan și ȘTEFAN';
		const ranges = searchRanges(text, 'stef stefan');
		expect(ranges.map((r) => text.slice(r.start, r.end))).toEqual(['Ștefan', 'ȘTEFAN']);
	});
	it('treats regex and HTML characters literally', () => {
		const text = 'Membru <script> a+b [x]';
		expect(searchRanges(text, '<script> a+b [x]').map((r) => text.slice(r.start, r.end))).toEqual([
			'<script>',
			'a+b',
			'[x]'
		]);
	});
});

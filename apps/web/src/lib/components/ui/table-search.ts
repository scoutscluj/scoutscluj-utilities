export const normalizeSearchText = (value: string) =>
	value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('ro');

export const searchTerms = (query: string) => [
	...new Set(normalizeSearchText(query).trim().split(/\s+/).filter(Boolean))
];

export const matchesSearch = (value: string, query: string) => {
	const text = normalizeSearchText(value);
	return searchTerms(query).every((term) => text.includes(term));
};

export function searchRanges(text: string, query: string) {
	let normalized = '';
	const offsets: { start: number; end: number }[] = [];
	let offset = 0;
	for (const character of text) {
		const value = normalizeSearchText(character);
		if (!value && offsets.length) offsets[offsets.length - 1].end = offset + character.length;
		for (let index = 0; index < value.length; index++)
			offsets.push({ start: offset, end: offset + character.length });
		normalized += value;
		offset += character.length;
	}
	const found: { start: number; end: number }[] = [];
	for (const term of searchTerms(query)) {
		let from = 0;
		while (from < normalized.length) {
			const index = normalized.indexOf(term, from);
			if (index === -1) break;
			found.push({ start: offsets[index].start, end: offsets[index + term.length - 1].end });
			from = index + term.length;
		}
	}
	return found
		.sort((a, b) => a.start - b.start)
		.reduce<{ start: number; end: number }[]>((ranges, range) => {
			const previous = ranges.at(-1);
			if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end);
			else ranges.push({ ...range });
			return ranges;
		}, []);
}

const highlightedTables = new Map<HTMLElement, Range[]>();
const highlightName = 'sc-table-search';

function publishHighlights() {
	if (typeof CSS === 'undefined' || !CSS.highlights || typeof Highlight === 'undefined') return;
	const ranges = [...highlightedTables.values()].flat();
	if (ranges.length) CSS.highlights.set(highlightName, new Highlight(...ranges));
	else CSS.highlights.delete(highlightName);
}

// Native ranges leave Svelte-owned text, links, selections and inputs untouched.
export function highlightSearch(node: HTMLElement, query = '') {
	let currentQuery = query;
	let frame = 0;
	const refresh = () => {
		frame = 0;
		const ranges: Range[] = [];
		if (currentQuery.trim()) {
			const walker = node.ownerDocument.createTreeWalker(node, NodeFilter.SHOW_TEXT);
			let textNode: Node | null;
			while ((textNode = walker.nextNode())) {
				const parent = textNode.parentElement;
				if (
					!parent ||
					parent.closest(
						'th, [role="columnheader"], [hidden], input, textarea, select, script, style, [aria-hidden="true"]'
					)
				)
					continue;
				for (const match of searchRanges(textNode.textContent ?? '', currentQuery)) {
					const range = node.ownerDocument.createRange();
					range.setStart(textNode, match.start);
					range.setEnd(textNode, match.end);
					ranges.push(range);
				}
			}
		}
		highlightedTables.set(node, ranges);
		publishHighlights();
	};
	const schedule = () => {
		if (frame) cancelAnimationFrame(frame);
		frame = requestAnimationFrame(refresh);
	};
	const observer = new MutationObserver(schedule);
	observer.observe(node, {
		childList: true,
		subtree: true,
		characterData: true,
		attributes: true,
		attributeFilter: ['hidden', 'aria-hidden']
	});
	schedule();
	return {
		update(value: string) {
			currentQuery = value;
			schedule();
		},
		destroy() {
			observer.disconnect();
			if (frame) cancelAnimationFrame(frame);
			highlightedTables.delete(node);
			publishHighlights();
		}
	};
}

import '@testing-library/jest-dom/vitest';

const emptyDomRect = () => new DOMRect(0, 0, 0, 0);

if (!Range.prototype.getBoundingClientRect) {
	Range.prototype.getBoundingClientRect = emptyDomRect;
}

if (!Range.prototype.getClientRects) {
	Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
}

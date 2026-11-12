export type ThemePreference = 'system' | 'light' | 'dark';
export const appearance = $state<{ preference: ThemePreference }>({ preference: 'system' });
const storageKey = 'scoutscluj-appearance';
const normalized = (value: unknown): ThemePreference =>
	value === 'light' || value === 'dark' ? value : 'system';

export function setAppearance(value: ThemePreference) {
	appearance.preference = normalized(value);
	document.documentElement.dataset.theme = appearance.preference;
	try {
		localStorage.setItem(storageKey, appearance.preference);
	} catch {
		// Apply the selection for this visit even if persistence is unavailable.
	}
}

export function initializeAppearance() {
	appearance.preference = normalized(document.documentElement.dataset.theme);
	const update = (event: StorageEvent) => {
		if (event.key !== storageKey && event.key !== null) return;
		appearance.preference = normalized(event.newValue);
		document.documentElement.dataset.theme = appearance.preference;
	};
	window.addEventListener('storage', update);
	return () => window.removeEventListener('storage', update);
}

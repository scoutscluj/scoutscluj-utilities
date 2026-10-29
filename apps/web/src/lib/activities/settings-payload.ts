import type { RegistrationSettings } from './registration';

/** DateInput edits local wall-clock times; API timestamps require an offset. */
export function registrationSettingsPayload(settings: RegistrationSettings): RegistrationSettings {
	const instant = (value: string) => {
		if (!value) return '';
		const date = new Date(value);
		// Let API validation report malformed input without crashing a live preview.
		return Number.isFinite(date.getTime()) ? date.toISOString() : value;
	};
	return { ...settings, opensAt: instant(settings.opensAt), closesAt: instant(settings.closesAt) };
}

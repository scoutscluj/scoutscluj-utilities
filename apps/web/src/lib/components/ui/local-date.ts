export function displayDate(value: string | number | null | undefined, withTime = false) {
	if (!value) return '';
	const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
	if (!match) return '';
	return `${match[3]}.${match[2]}.${match[1]}${withTime && match[4] ? ` ${match[4]}:${match[5]}` : ''}`;
}
export function parseLocalDate(text: string, withTime = false) {
	if (!text.trim()) return '';
	const match = text.match(
		withTime ? /^(\d{2})[./](\d{2})[./](\d{4}) (\d{2}):(\d{2})$/ : /^(\d{2})[./](\d{2})[./](\d{4})$/
	);
	if (!match) return null;
	const [, day, month, year, hour, minute] = match;
	const date = new Date(`${year}-${month}-${day}T12:00:00Z`);
	if (
		!Number.isFinite(date.getTime()) ||
		date.getUTCDate() !== +day ||
		date.getUTCMonth() + 1 !== +month ||
		+year < 1 ||
		(withTime && (+hour > 23 || +minute > 59))
	)
		return null;
	return `${year}-${month}-${day}${withTime ? `T${hour}:${minute}` : ''}`;
}

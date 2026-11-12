// Apply the saved preference before the first paint; restricted storage falls back to the system.
(() => {
	let preference = 'system';
	try {
		const saved = localStorage.getItem('scoutscluj-appearance');
		if (['system', 'light', 'dark'].includes(saved)) preference = saved;
	} catch {
		// The site remains usable when browser storage is unavailable.
	}
	document.documentElement.dataset.theme = preference;
})();

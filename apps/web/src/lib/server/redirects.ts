export const getSafeRedirectTarget = (value: string | null | undefined) => {
	if (!value) {
		return '/';
	}

	if (!value.startsWith('/') || value.startsWith('//')) {
		return '/';
	}

	if (value.startsWith('/login') || value.startsWith('/auth/')) {
		return '/';
	}

	return value;
};

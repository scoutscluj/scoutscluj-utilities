export const usesAuthenticatedShell = (pathname: string, authenticated: boolean) =>
	authenticated && (pathname === '/cotizatie' || pathname.startsWith('/cotizatie/'));

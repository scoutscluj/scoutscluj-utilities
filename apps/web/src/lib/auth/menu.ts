import type { MenuItem } from './types';

export const menuItems: MenuItem[] = [
	{ label: 'Dashboard', href: '/' },
	{
		label: 'Info',
		children: [
			{ label: 'Anunturi', disabled: true },
			{ label: 'National', disabled: true },
			{ label: 'General', disabled: true }
		]
	},
	{
		label: 'Sediu',
		children: [
			{ label: 'Regulament', disabled: true },
			{ label: 'Inventar', disabled: true },
			{ label: 'Calendar', disabled: true }
		]
	},
	{
		label: 'Financiar',
		children: [
			{ label: 'Buget', disabled: true },
			{ label: 'Cotizatii', disabled: true }
		]
	},
	{ label: 'Micro-stagii', disabled: true },
	{ label: 'Parteneri', disabled: true },
	{ label: 'Profil', href: '/profile' },
	{
		label: 'Admin',
		minRole: 'moderator',
		children: [
			{ label: 'Administrare', href: '/admin', minRole: 'moderator' },
			{ label: 'Utilizatori', disabled: true, minRole: 'admin' },
			{ label: 'Notificari', disabled: true, minRole: 'super_admin' }
		]
	}
];

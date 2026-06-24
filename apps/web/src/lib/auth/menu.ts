import type { MenuItem } from './types';

export const menuItems: MenuItem[] = [
	{ label: 'Dashboard', href: '/' },
	{
		label: 'Info',
		children: [
			{ label: 'Anunțuri', disabled: true },
			{ label: 'Național', disabled: true },
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
			{ label: 'Documente', href: '/finance/documents' },
			{ label: 'Panou financiar', href: '/finance', minRole: 'finance_manager' },
			{ label: 'Buget', disabled: true },
			{ label: 'Cotizații', disabled: true }
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
			{ label: 'Notificări', disabled: true, minRole: 'super_admin' }
		]
	}
];

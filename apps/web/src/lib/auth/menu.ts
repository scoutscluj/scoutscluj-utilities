import type { MenuItem } from './types';

export const menuItems: MenuItem[] = [
	{ label: 'Dashboard', href: '/' },
	{
		label: 'Info',
		children: [
			{ label: 'Anunțuri', disabled: true },
			{ label: 'Național', disabled: true },
			{ label: 'Statut ONCR', href: '/info/statut' },
			{ label: 'Regulament ONCR', href: '/programe/regulamente' },
			{ label: 'General', disabled: true }
		]
	},
	{
		label: 'Sediu',
		children: [
			{ label: 'Regulament', href: '/sediu/regulament' },
			{ label: 'Inventar', disabled: true },
			{ label: 'Calendar', href: '/sediu/orar' }
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
	{ label: 'Activități', href: '/activities' },
	{ label: 'Micro-stagii', disabled: true },
	{ label: 'Parteneri', disabled: true },
	{ label: 'Profil', href: '/profile' },
	{
		label: 'Admin',
		minRole: 'moderator',
		children: [
			{ label: 'Administrare', href: '/admin', minRole: 'moderator' },
			{ label: 'Utilizatori', href: '/admin/users', minRole: 'super_admin' },
			{ label: 'Audit', href: '/audit', minRole: 'super_admin' },
			{ label: 'Notificări', href: '/admin/notifications', minRole: 'super_admin' }
		]
	}
];

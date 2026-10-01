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
			{ label: 'Inventar', href: '/sediu/inventar' },
			{ label: 'Calendar', href: '/sediu/orar' }
		]
	},
	{
		label: 'Financiar',
		children: [
			{ label: 'Documente', href: '/finance/documents' },
			{ label: 'Panou financiar', href: '/finance', minRole: 'finance_manager' },
			{ label: 'Buget', disabled: true },
			{ label: 'Cotizații', href: '/cotizatie' }
		]
	},
	{ label: 'Activități', href: '/activities' },
	{ label: 'Micro-stagii', disabled: true },
	{ label: 'Parteneri', disabled: true },
	{ label: 'Profil', href: '/profile' },
	{
		label: 'Admin',
		anyRole: ['moderator', 'admin', 'finance_manager', 'super_admin'],
		children: [
			{ label: 'Administrare', href: '/admin', minRole: 'moderator' },
			{
				label: 'Financiar',
				anyRole: ['admin', 'finance_manager', 'super_admin'],
				children: [
					{ label: 'Prezentare', href: '/admin/finance' },
					{ label: 'Membri și cotizații', href: '/admin/finance/membership' },
					{ label: 'Încasări și alocări', href: '/admin/finance/receipts' },
					{ label: 'Transferuri naționale', href: '/admin/finance/transfers' },
					{ label: 'Configurare cotizații', href: '/admin/finance/membership-settings' },
					{ label: 'Procesatori de plăți', href: '/admin/finance/payment-processor' },
					{ label: 'Ghid financiar', href: '/admin/finance/guide' }
				]
			},
			{ label: 'Acorduri parentale', href: '/admin/parental-consent', minRole: 'admin' },
			{ label: 'Utilizatori', href: '/admin/users', minRole: 'super_admin' },
			{ label: 'Audit', href: '/audit', minRole: 'super_admin' },
			{ label: 'Notificări', href: '/admin/notifications', minRole: 'super_admin' }
		]
	}
];

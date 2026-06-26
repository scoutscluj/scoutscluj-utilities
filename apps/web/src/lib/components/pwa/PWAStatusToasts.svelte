<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { pwa } from '$lib/pwa/pwa.svelte';

	const installToastId = 'pwa-install';
	const updateToastId = 'pwa-update';
	const offlineToastId = 'pwa-offline';

	onMount(() => pwa.init());

	const buildLabel = $derived(`${pwa.currentVersion} (${pwa.currentCommitHash})`);
	const updateDescription = $derived(
		pwa.lastVersion && pwa.lastVersion !== pwa.currentVersion
			? `Versiune: ${pwa.lastVersion} -> ${pwa.currentVersion}`
			: `Build: ${buildLabel}`
	);

	$effect(() => {
		if (!pwa.showInstallPrompt) {
			toast.dismiss(installToastId);
			return;
		}

		if (pwa.installMode === 'manual') {
			toast.info('Instalează ScoutsCluj din meniul browserului.', {
				id: installToastId,
				description: 'Pe iPhone/iPad: Share, apoi Add to Home Screen.',
				duration: Infinity,
				cancel: {
					label: 'Mai târziu',
					onClick: () => pwa.dismissInstallPrompt()
				},
				onDismiss: () => pwa.dismissInstallPrompt()
			});
			return;
		}

		toast.info('Instalează ScoutsCluj pe dispozitiv.', {
			id: installToastId,
			description: 'Vei avea acces rapid din ecranul principal.',
			duration: Infinity,
			action: {
				label: 'Instalează',
				onClick: () => void pwa.promptInstall()
			},
			cancel: {
				label: 'Mai târziu',
				onClick: () => pwa.dismissInstallPrompt()
			},
			onDismiss: () => pwa.dismissInstallPrompt()
		});
	});

	$effect(() => {
		if (!pwa.updateAvailable) {
			toast.dismiss(updateToastId);
			return;
		}

		toast.success('O versiune nouă este disponibilă.', {
			id: updateToastId,
			description: updateDescription,
			duration: Infinity,
			action: {
				label: 'Actualizează',
				onClick: () => pwa.reloadForUpdate()
			},
			cancel: {
				label: 'Mai târziu',
				onClick: () => pwa.dismissUpdate()
			},
			onDismiss: () => pwa.dismissUpdate()
		});
	});

	$effect(() => {
		if (!pwa.isOffline) {
			toast.dismiss(offlineToastId);
			return;
		}

		toast.warning('Ești offline.', {
			id: offlineToastId,
			description: 'Datele salvate local pot fi disponibile. Modificările necesită internet.',
			duration: Infinity,
			dismissible: false
		});
	});
</script>

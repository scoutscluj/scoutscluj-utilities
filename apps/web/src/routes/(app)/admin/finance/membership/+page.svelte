<script lang="ts">
	import MembershipAdminPage from '$lib/membership/MembershipAdminPage.svelte';
	import MembershipRegistry from '$lib/membership/MembershipRegistry.svelte';
	let { data, form } = $props();
</script>

<MembershipAdminPage
	title="Membri și cotizații"
	description="Situația cotizațiilor pentru fiecare membru, în perioada selectată."
	{form}
>
	<MembershipRegistry ledger={data.ledger} />
</MembershipAdminPage>

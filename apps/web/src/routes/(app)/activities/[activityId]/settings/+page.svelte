<script lang="ts">
	import ActivityDepartmentForm from '../ActivityDepartmentForm.svelte';
	import ActivityDetailsForm from '../ActivityDetailsForm.svelte';

	let { data, form } = $props();
</script>

<section class="settings-page">
	<ActivityDetailsForm activity={data.activity} message={form?.detailsMessage} />
	<ActivityDepartmentForm
		activity={data.activity}
		user={data.user}
		message={form?.departmentMessage}
	/>
</section>

<style>
	.settings-page {
		display: grid;
		gap: 14px;
	}
</style>

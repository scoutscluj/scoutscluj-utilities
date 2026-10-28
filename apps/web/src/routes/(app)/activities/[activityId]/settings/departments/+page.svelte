<script lang="ts">
	import ActivityDepartmentForm from '../../ActivityDepartmentForm.svelte';
	let { data, form } = $props();
</script>

<ActivityDepartmentForm
	activity={data.activity}
	user={data.user}
	message={form?.departmentMessage}
/>

<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Activity, ActivityDepartment } from './+layout.server';

	type Props = {
		activity: Activity;
	};

	let { activity }: Props = $props();

	const hasDepartment = (department: ActivityDepartment) =>
		activity.departments.includes(department);
	const hasAnyDepartment = $derived(
		hasDepartment('finance') ||
			hasDepartment('kitchen') ||
			hasDepartment('program') ||
			hasDepartment('logistics')
	);
</script>

{#if hasAnyDepartment}
	<div class="action-grid">
		{#if hasDepartment('finance')}
			<a href={resolve(`/activities/${activity.id}/finance`)}>
				<span>Financiar</span>
				<p>Documente, chitanțe, facturi și registrul activității.</p>
			</a>
		{/if}
		{#if hasDepartment('kitchen')}
			<a href={resolve(`/activities/${activity.id}/kitchen`)}>
				<span>Bucătărie</span>
				<p>Mese, rețete, ingrediente, aprovizionare și rapoarte.</p>
			</a>
		{/if}
		{#if hasDepartment('program')}
			<div class="disabled-card">
				<span>Program</span>
				<p>Departamentul este activ, dar pagina nu este implementată încă.</p>
			</div>
		{/if}
		{#if hasDepartment('logistics')}
			<div class="disabled-card">
				<span>Logistică</span>
				<p>Departamentul este activ, dar pagina nu este implementată încă.</p>
			</div>
		{/if}
	</div>
{/if}

<style>
	.action-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
	}

	.action-grid a,
	.disabled-card {
		border: 1px solid #dbe3ef;
		border-radius: 8px;
		background: #ffffff;
		padding: 18px;
		box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
	}

	.action-grid span,
	.disabled-card span {
		color: #0f172a;
		font-weight: 900;
	}

	.action-grid a {
		color: #334155;
		text-decoration: none;
	}

	.action-grid a:hover {
		border-color: #991b1b;
	}

	.disabled-card {
		color: #64748b;
	}

	p {
		margin: 0;
		color: #64748b;
	}

	@media (max-width: 720px) {
		.action-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

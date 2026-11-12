<script lang="ts">
	import { managesActivity } from '$lib/auth/activity-access';
	import type { CurrentUser } from '$lib/auth/types';
	import type { Activity, ActivityDepartment } from './+layout.server';
	import { departmentOptions } from './activity-meta';

	type Props = {
		activity: Activity;
		user: CurrentUser;
		message?: string;
	};

	let { activity, user, message }: Props = $props();

	const canManageDepartments = $derived(
		managesActivity(activity, user) || user.roles.includes('super_admin')
	);
	const hasDepartment = (department: ActivityDepartment) =>
		activity.departments.includes(department);
</script>

{#if canManageDepartments}
	<form class="panel department-form" method="POST" action="?/departments">
		<div>
			<p class="panel-title">Departamente</p>
			<p>Alege ce departamente apar pentru această activitate.</p>
		</div>

		<div class="department-options">
			{#each departmentOptions as department (department.id)}
				<label>
					<input
						type="checkbox"
						name="departments"
						value={department.id}
						checked={hasDepartment(department.id)}
					/>
					<span>
						<strong>{department.label}</strong>
						<small>{department.description}</small>
					</span>
				</label>
			{/each}
		</div>

		<p class="warning">
			Dezactivarea unui departament îl ascunde din navigație, dar datele existente rămân păstrate.
		</p>

		<div class="department-actions">
			<button type="submit">Salvează departamentele</button>
			{#if message}
				<p class="form-message">{message}</p>
			{/if}
		</div>
	</form>
{/if}

<style>
	.panel {
		display: grid;
		gap: 16px;
		border: 1px solid var(--sc-border);
		border-radius: 8px;
		background: var(--sc-surface);
		padding: 18px;
		box-shadow: var(--sc-shadow);
	}

	.panel-title {
		margin: 0;
		color: var(--sc-ink);
		font-weight: 600;
	}

	p {
		margin: 0;
		color: var(--sc-muted);
	}

	.department-form {
		gap: 14px;
	}

	.department-options {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}

	.department-options label {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		border: 1px solid var(--sc-border);
		border-radius: 8px;
		padding: 12px;
		color: var(--sc-ink);
	}

	.department-options input {
		margin-top: 3px;
	}

	.department-options span {
		display: grid;
		gap: 3px;
	}

	.department-options small {
		color: var(--sc-muted);
		font-size: 0.82rem;
		line-height: 1.35;
	}

	.department-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
	}

	button {
		min-height: 44px;
		border: 0;
		border-radius: 8px;
		background: var(--sc-accent);
		padding: 0 14px;
		color: var(--sc-on-accent);
		font-weight: 600;
		cursor: pointer;
	}

	.form-message {
		color: var(--sc-info);
		font-weight: 600;
	}

	.warning {
		border: 1px solid var(--sc-warning);
		border-radius: 8px;
		background: var(--sc-warning-soft);
		padding: 10px 12px;
		color: var(--sc-warning);
	}

	@media (max-width: 720px) {
		.department-options {
			grid-template-columns: 1fr;
		}
	}

	input:not([type='hidden']):not([type='checkbox']):not([type='radio']) {
		background: var(--sc-inset);
		color: var(--sc-ink);
		border-color: var(--sc-control-border);
	}
</style>

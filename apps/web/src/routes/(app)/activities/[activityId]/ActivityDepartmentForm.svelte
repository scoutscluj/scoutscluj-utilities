<script lang="ts">
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
		activity.coordinatorId === user.id || user.roles.includes('super_admin')
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
		border: 1px solid #dbe3ef;
		border-radius: 8px;
		background: #ffffff;
		padding: 18px;
		box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
	}

	.panel-title {
		margin: 0;
		color: #0f172a;
		font-weight: 900;
	}

	p {
		margin: 0;
		color: #64748b;
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
		border: 1px solid #dbe3ef;
		border-radius: 8px;
		padding: 12px;
		color: #334155;
	}

	.department-options input {
		margin-top: 3px;
	}

	.department-options span {
		display: grid;
		gap: 3px;
	}

	.department-options small {
		color: #64748b;
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
		min-height: 38px;
		border: 0;
		border-radius: 8px;
		background: #0f766e;
		padding: 0 14px;
		color: #ffffff;
		font-weight: 800;
		cursor: pointer;
	}

	.form-message {
		color: #1e3a8a;
		font-weight: 750;
	}

	.warning {
		border: 1px solid #facc15;
		border-radius: 8px;
		background: #fefce8;
		padding: 10px 12px;
		color: #713f12;
	}

	@media (max-width: 720px) {
		.department-options {
			grid-template-columns: 1fr;
		}
	}
</style>

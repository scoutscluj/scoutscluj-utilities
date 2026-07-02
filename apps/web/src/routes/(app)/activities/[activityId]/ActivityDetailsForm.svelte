<script lang="ts">
	import type { Activity } from './+layout.server';
	import { activityStatusOptions, activityTypeOptions, dateInputValue } from './activity-meta';

	type Props = {
		activity: Activity;
		message?: string;
	};

	let { activity, message }: Props = $props();
</script>

<form class="panel details-form" method="POST" action="?/details">
	<div>
		<p class="panel-title">Detalii</p>
		<p>Editează datele generale ale activității.</p>
	</div>

	<div class="form-grid">
		<label class="wide">
			<span>Nume</span>
			<input name="title" value={activity.title} required />
		</label>
		<label>
			<span>Tip</span>
			<select name="type">
				{#each activityTypeOptions as option (option.value)}
					<option value={option.value} selected={option.value === activity.type}
						>{option.label}</option
					>
				{/each}
			</select>
		</label>
		<label>
			<span>Stare</span>
			<select name="status">
				{#each activityStatusOptions as option (option.value)}
					<option value={option.value} selected={option.value === activity.status}
						>{option.label}</option
					>
				{/each}
			</select>
		</label>
		<label>
			<span>Început</span>
			<input name="startDate" type="date" value={dateInputValue(activity.startDate)} />
		</label>
		<label>
			<span>Final</span>
			<input name="endDate" type="date" value={dateInputValue(activity.endDate)} />
		</label>
		<label class="wide">
			<span>Loc</span>
			<input name="location" value={activity.location ?? ''} />
		</label>
		<label class="wide">
			<span>Descriere</span>
			<textarea name="description" rows="4">{activity.description ?? ''}</textarea>
		</label>
	</div>

	<div class="form-actions">
		<button type="submit">Salvează detaliile</button>
		{#if message}
			<p>{message}</p>
		{/if}
	</div>
</form>

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

	.panel-title,
	p {
		margin: 0;
	}

	.panel-title {
		color: #0f172a;
		font-weight: 900;
	}

	p {
		color: #64748b;
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}

	label {
		display: grid;
		gap: 6px;
		color: #334155;
		font-size: 0.84rem;
		font-weight: 800;
	}

	.wide {
		grid-column: 1 / -1;
	}

	input,
	select,
	textarea {
		width: 100%;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 10px 11px;
		color: #0f172a;
		font: inherit;
	}

	textarea {
		resize: vertical;
	}

	.form-actions {
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

	.form-actions p {
		color: #1e3a8a;
		font-weight: 750;
	}

	@media (max-width: 720px) {
		.form-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

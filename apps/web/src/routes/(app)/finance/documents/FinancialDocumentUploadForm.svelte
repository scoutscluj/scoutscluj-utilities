<script lang="ts">
	import type { Activity, ActivityType } from './+page.server';

	type Props = {
		activities: Activity[];
		handoffMode: 'review_first' | 'direct_to_keez';
	};

	let { activities, handoffMode }: Props = $props();

	const activityTypeLabels: Record<ActivityType, string> = {
		camp: 'Camp',
		hike: 'Drumeție',
		festival: 'Festival',
		training: 'Formare',
		meeting: 'Întâlnire',
		other: 'Alt tip'
	};
</script>

<form class="panel upload-panel" method="POST" action="?/upload" enctype="multipart/form-data">
	<div>
		<p class="panel-title">Încărcare document</p>
		<p class="panel-subtitle">PDF, imagine sau poză din telefon, maxim 15 MB.</p>
	</div>

	<p class="handoff-note">
		{handoffMode === 'direct_to_keez'
			? 'Documentul va fi trimis automat către contabilitate după încărcare.'
			: 'Documentul va fi verificat de responsabilul financiar înainte de trimiterea către contabilitate.'}
	</p>

	<label>
		<span>Document</span>
		<input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif" required />
	</label>

	<label>
		<span>Activitate</span>
		<select name="activityId">
			<option value="">Fără activitate</option>
			{#each activities as activity (activity.id)}
				<option value={activity.id}>{activity.title} · {activityTypeLabels[activity.type]}</option>
			{/each}
		</select>
	</label>

	<label>
		<span>Notițe</span>
		<textarea name="notes" rows="4" placeholder="Opțional"></textarea>
	</label>

	<button type="submit">Trimite documentul</button>
</form>

<style>
	.panel {
		display: grid;
		align-content: start;
		gap: 14px;
		border: 1px solid #d8dee6;
		border-radius: 8px;
		background: #ffffff;
		padding: 18px;
	}

	.panel-title,
	p {
		margin: 0;
	}

	.panel-title {
		font-size: 1rem;
		font-weight: 900;
	}

	.panel-subtitle,
	.handoff-note {
		margin-top: 4px;
		color: #52616f;
		font-size: 0.92rem;
	}

	.handoff-note {
		border-left: 3px solid #0f766e;
		background: #f0fdfa;
		padding: 10px 12px;
		font-weight: 800;
	}

	label {
		display: grid;
		gap: 6px;
		font-weight: 800;
	}

	input,
	select,
	textarea {
		width: 100%;
		min-width: 0;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: #ffffff;
		padding: 10px 12px;
		color: #17202a;
	}

	textarea {
		resize: vertical;
	}

	button {
		min-height: 38px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 0;
		border-radius: 8px;
		background: #c81e1e;
		padding: 0 14px;
		color: #ffffff;
		font-weight: 900;
		cursor: pointer;
	}

	button:hover {
		background: #991b1b;
	}

	@media (max-width: 620px) {
		button {
			width: 100%;
		}
	}
</style>

<script lang="ts">
	import type { Activity, ActivityType } from './+page.server';

	type Props = {
		activities?: Activity[];
		handoffMode: 'review_first' | 'direct_to_keez';
		showHeader?: boolean;
		fixedActivityId?: number;
		fixedActivityLabel?: string;
	};

	let {
		activities = [],
		handoffMode,
		showHeader = true,
		fixedActivityId,
		fixedActivityLabel
	}: Props = $props();

	const activityTypeLabels: Record<ActivityType, string> = {
		camp: 'Camp',
		hike: 'Drumeție',
		festival: 'Festival',
		training: 'Formare',
		meeting: 'Întâlnire',
		other: 'Alt tip'
	};
</script>

<form class="upload-form" method="POST" action="?/upload" enctype="multipart/form-data">
	{#if showHeader}
		<div>
			<p class="panel-title">Încărcare document</p>
			<p class="panel-subtitle">PDF sau imagine convertită automat în PDF, maxim 15 MB.</p>
		</div>
	{/if}

	<p class="handoff-note">
		{handoffMode === 'direct_to_keez'
			? 'Documentul va fi trimis automat către contabilitate după încărcare.'
			: 'Documentul va fi gata de trimis către contabilitate pentru responsabilul financiar.'}
	</p>

	<label>
		<span>Document</span>
		<input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif" required />
	</label>

	{#if fixedActivityId}
		<input type="hidden" name="activityId" value={fixedActivityId} />
		<div class="fixed-activity">
			<span>Activitate</span>
			<strong>{fixedActivityLabel ?? 'Activitatea curenta'}</strong>
		</div>
	{:else}
		<label>
			<span>Activitate</span>
			<select name="activityId">
				<option value="">Fără activitate</option>
				{#each activities as activity (activity.id)}
					<option value={activity.id}>
						{activity.title} · {activityTypeLabels[activity.type]}
					</option>
				{/each}
			</select>
		</label>
	{/if}

	<label>
		<span>Notițe</span>
		<textarea name="notes" rows="4" placeholder="Opțional"></textarea>
	</label>

	<button type="submit">Trimite documentul</button>
</form>

<style>
	.upload-form {
		display: grid;
		align-content: start;
		gap: 14px;
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

	.fixed-activity {
		display: grid;
		gap: 4px;
		border: 1px solid #dbe3ef;
		border-radius: 8px;
		background: #f8fafc;
		padding: 10px 12px;
		color: #334155;
	}

	.fixed-activity span {
		font-size: 0.78rem;
		font-weight: 900;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	.fixed-activity strong {
		min-width: 0;
		overflow: hidden;
		color: #0f172a;
		font-size: 0.95rem;
		text-overflow: ellipsis;
		white-space: nowrap;
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

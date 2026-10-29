<script lang="ts">
	import {
		fixedConsentLabels,
		fixedConsentHelp,
		fixedConsentOptionalFields,
		type FixedConsentDetails
	} from '@scouts-cluj/parental-consent-schema';
	import EquipmentList from './EquipmentList.svelte';
	import ConsentPreview from './ConsentPreview.svelte';
	import type { Overview, RegistrationSettings, RegistrationIssue } from './registration';
	let {
		settings,
		lists,
		activityId,
		activity,
		saved = false,
		issues = []
	}: {
		settings: RegistrationSettings;
		lists: Overview['lists'];
		activityId: number;
		activity?: { title?: string; location?: string; startDate?: string; endDate?: string };
		saved?: boolean;
		issues?: RegistrationIssue[];
	} = $props();
	const units = $derived(
		(lists?.units ?? [])
			.filter(
				(u) =>
					(!settings.structureIds.length || settings.structureIds.includes(u.structureId)) &&
					(!settings.unitIds.length || settings.unitIds.includes(u.id)) &&
					(!settings.groupIds.length ||
						lists?.groups.some((g) => settings.groupIds.includes(g.id) && g.parentId === u.id))
			)
			.map((u) => ({
				...u,
				displayName: `${new Set((lists?.units ?? []).filter((x) => !settings.structureIds.length || settings.structureIds.includes(x.structureId)).map((x) => x.structureId)).size > 1 ? `${lists?.structures.find((s) => s.id === u.structureId)?.name ?? u.structureId} · ` : ''}${u.name}`
			}))
	);
	function specific(unitId: string, value: string) {
		settings.unitActivities ??= {};
		settings.unitActivities[unitId] = value;
	}
</script>

{#if settings.consent}
	<div class="consent-layout">
		<div class="fields">
			{#each Object.entries(fixedConsentLabels).filter(([key]) => key !== 'specificActivities') as [key, label] (key)}
				<div class="field">
					<label for={`consent-${key}`}
						>{label}
						<small
							>{fixedConsentOptionalFields.includes(key as keyof FixedConsentDetails)
								? '(opțional)'
								: '(obligatoriu pentru publicare)'}</small
						></label
					>
					<p id={`help-${key}`}>{fixedConsentHelp[key as keyof FixedConsentDetails]}</p>
					{#if key === 'equipment'}<EquipmentList
							bind:value={settings.consent.equipment}
							invalid={issues.some((i) => i.field === 'consent.equipment')}
						/>{:else}<textarea
							id={`consent-${key}`}
							aria-describedby={`help-${key}`}
							aria-invalid={issues.some((i) => i.field === `consent.${key}`)}
							rows={['representative', 'coordinators'].includes(key) ? 2 : 4}
							maxlength="12000"
							bind:value={settings.consent[key as keyof FixedConsentDetails]}
						></textarea>{/if}
				</div>
				{#if key === 'commonActivities'}
					{#if settings.unitActivities === undefined && settings.consent.specificActivities}<div
							class="legacy"
						>
							<strong>Text din acordul anterior</strong>
							<p>{settings.consent.specificActivities}</p>
							<button
								type="button"
								onclick={() => {
									if (settings.consent) {
										settings.consent.commonActivities = [
											settings.consent.commonActivities,
											settings.consent.specificActivities
										]
											.filter(Boolean)
											.join('\n');
										settings.consent.specificActivities = '';
										settings.unitActivities = {};
									}
								}}>Include în Activități</button
							>
						</div>{/if}
					{#if units.length > 1 || units.some((u) => settings.unitActivities?.[u.id])}<fieldset>
							<legend>Activități specifice unităților · opțional</legend>
							<p>
								Completează numai diferențele față de „Activități”. În acord apare doar textul
								unității participantului.
							</p>
							{#each units as unit (unit.id)}<label for={`unit-activities-${unit.id}`}
									>{unit.displayName}</label
								><textarea
									id={`unit-activities-${unit.id}`}
									rows="3"
									maxlength="12000"
									value={settings.unitActivities?.[unit.id] ?? ''}
									oninput={(e) => specific(unit.id, e.currentTarget.value)}
									placeholder="Fără activități suplimentare pentru această unitate"
								></textarea>{/each}
						</fieldset>{/if}
				{/if}
			{/each}
		</div>
		<ConsentPreview {activityId} {activity} {settings} {units} {saved} />
	</div>
{/if}

<style>
	.consent-layout {
		display: grid;
		grid-template-columns: minmax(0, min(44%, 640px)) minmax(0, 1fr);
		gap: 24px;
		align-items: start;
	}
	.fields,
	.field {
		display: grid;
		gap: 8px;
		min-width: 0;
	}
	.fields {
		gap: 24px;
	}
	label,
	legend {
		font-weight: 600;
		font-size: 14px;
	}
	small {
		font-size: 12px;
		font-weight: 400;
		color: var(--sc-muted);
	}
	p {
		margin: 0;
		color: var(--sc-muted);
		font-size: 13px;
		line-height: 1.5;
	}
	textarea {
		width: 100%;
		box-sizing: border-box;
		padding: 10px 12px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		resize: vertical;
	}
	textarea[aria-invalid='true'] {
		border: 2px solid var(--sc-accent);
	}
	fieldset {
		display: grid;
		gap: 10px;
		border: 1px solid var(--sc-border);
		border-radius: 8px;
		padding: 16px;
		margin: 0;
	}
	.legacy {
		padding: 12px;
		border: 1px solid var(--sc-border);
		display: grid;
		gap: 8px;
	}
	.legacy p {
		white-space: pre-wrap;
	}
	button {
		min-height: 38px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		padding: 8px 12px;
		justify-self: start;
		cursor: pointer;
	}
	@media (max-width: 1000px) {
		.consent-layout {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>

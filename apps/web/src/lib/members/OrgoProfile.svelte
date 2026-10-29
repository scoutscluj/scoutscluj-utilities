<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Detail } from './types';
	let { detail }: { detail: Detail } = $props();
	const m = $derived(detail.member),
		a = $derived(detail.access),
		profile = $derived(m.orgoProfile ?? {});
	const custom = $derived(
		Array.isArray(profile.customFieldValues)
			? (profile.customFieldValues as { field: number; value: unknown; media: unknown }[])
			: []
	);
	const definitions = $derived(
		Array.isArray(profile.customDefinitions)
			? (profile.customDefinitions as {
					id: number;
					name?: string;
					visibility?: string;
					type?: string;
					options?: { options?: Record<string, string> };
				}[])
			: []
	);
	const show = (v: unknown): string =>
		v === null || v === undefined
			? '—'
			: typeof v === 'object' && 'name' in v
				? String(v.name)
				: typeof v === 'object'
					? JSON.stringify(v)
					: String(v);
	const choices = (id: number) =>
		Object.entries(definitions.find((d) => Number(d.id) === id)?.options?.options ?? {});
	const editable = (key: string, value: unknown) =>
		(a.edit || a.own) &&
		!m.orgoReadonly?.includes(key) &&
		(value === null || ['string', 'number', 'boolean'].includes(typeof value)) &&
		(![
			'firstName',
			'lastName',
			'middleName',
			'dateBirth',
			'dateJoined',
			'dateJoinedFullMember'
		].includes(key) ||
			a.identity);
</script>

<section>
	<h2>Profilul din Orgo (membri.scout.ro)</h2>
	{#if profile.logo}<img
			class="avatar"
			src={resolve(`/units/${m.id}/photo`)}
			alt={`Fotografia lui ${m.name}`}
		/>{/if}
	{#if a.edit || a.own}<details>
			<summary>Schimbă fotografia</summary>
			<form method="POST" enctype="multipart/form-data">
				<input type="hidden" name="action" value="photo" /><input
					type="hidden"
					name="revision"
					value={m.revision}
				/>
				<label
					>Fotografie (JPG, PNG sau WebP, maximum 2 MB)<input
						type="file"
						name="file"
						accept="image/jpeg,image/png,image/webp"
						required
					/></label
				><button>Salvează fotografia</button>
			</form>
		</details>{/if}
	<details>
		<summary>Date personale și informații suplimentare</summary>
		<form method="POST">
			<input type="hidden" name="action" value="orgo-profile" /><input
				type="hidden"
				name="revision"
				value={m.revision}
			/>
			<div class="grid">
				{#each Object.entries(m.orgoFields ?? {}).filter(([key]) => !['logo', 'customFieldValues'].includes(key) && key in profile) as [key, label] (key)}
					<label
						>{label}
						{#if editable(key, profile[key])}<input
								name={`orgo.${key}`}
								value={profile[key] === null ? '' : String(profile[key])}
								maxlength="4000"
							/>
						{:else}<span>{show(profile[key])}</span>{/if}
					</label>{/each}
				{#each custom as field (field.field)}
					<label
						>{definitions.find((d) => Number(d.id) === field.field)?.name ??
							`Informație Orgo ${field.field}`}
						{#if a.identity && definitions.some((d) => Number(d.id) === field.field) && ['string', 'number', 'boolean'].includes(typeof field.value)}
							{#if choices(field.field).length}<select
									name={`orgo.custom:${field.field}`}
									value={String(field.value ?? '')}
									><option value="">Nespecificat</option
									>{#each choices(field.field) as [value, label] (value)}<option {value}
											>{label}</option
										>{/each}</select
								>
							{:else if typeof field.value === 'boolean'}<select
									name={`orgo.custom:${field.field}`}
									value={String(field.value)}
									><option value="true">Da</option><option value="false">Nu</option></select
								>
							{:else}<input
									name={`orgo.custom:${field.field}`}
									value={String(field.value ?? '')}
									maxlength="4000"
								/>{/if}
						{:else}<span
								>{choices(field.field).find(([value]) => value === String(field.value))?.[1] ??
									show(field.value)}</span
							>{/if}
					</label>{/each}
			</div>
			{#if a.edit || a.own}<button>Salvează informațiile Orgo</button>{/if}
		</form>
	</details>
	{#if m.promiseSource === 'orgo-leader'}<p>
			Promisiunea de lider este confirmată prin rolul existent în Orgo (membri.scout.ro). Data nu
			este consemnată.
		</p>{/if}
</section>

<style>
	section {
		padding: 24px;
		border: 1px solid #dce5df;
		border-radius: 14px;
		background: white;
	}
	h2 {
		margin-top: 0;
		font-size: 1.2rem;
	}
	.avatar {
		width: 112px;
		height: 112px;
		object-fit: cover;
		border-radius: 50%;
		margin-bottom: 16px;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 16px;
	}
	label {
		display: grid;
		gap: 7px;
		font-size: 0.9rem;
	}
	input,
	select,
	button {
		font: inherit;
		padding: 10px;
		border: 1px solid var(--sc-border-strong);
		border-radius: 7px;
		min-width: 0;
	}
	span {
		overflow-wrap: anywhere;
		white-space: pre-wrap;
		color: #50675a;
	}
	form {
		display: grid;
		gap: 16px;
		margin-top: 16px;
	}
	button {
		cursor: pointer;
		background: var(--sc-accent);
		color: white;
	}
	details {
		margin: 12px 0;
	}
	summary {
		cursor: pointer;
		font-weight: 600;
	}
</style>

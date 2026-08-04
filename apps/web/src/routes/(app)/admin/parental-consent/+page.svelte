<script lang="ts">
	import { resolve } from '$app/paths';
	let { data, form } = $props();
	const activeTemplate = $derived(data.templates.find((template) => template.status === 'active'));
	const formatDate = (value?: string) =>
		value
			? new Intl.DateTimeFormat('ro-RO', { dateStyle: 'medium', timeStyle: 'short' }).format(
					new Date(value)
				)
			: '—';
</script>

<svelte:head><title>Acorduri parentale | Administrare</title></svelte:head>

<section class="page">
	<header>
		<div>
			<p class="eyebrow">Admin · Scouts Cluj</p>
			<h1>Acorduri parentale</h1>
		</div>
		<p>Template global versionat, identitate și biblioteca de asset-uri aprobate.</p>
	</header>
	{#if form?.message}<div class="message error" role="alert">
			{form.message}
		</div>{:else if form?.success}<div class="message success">
			Modificările au fost salvate.
		</div>{/if}

	<section class="panel">
		<div class="panel-title">
			<div>
				<h2>Versiuni template</h2>
				<p>O singură versiune poate fi activă.</p>
			</div>
			<span class="active-chip">Activ: v{activeTemplate?.version ?? '—'}</span>
		</div>
		<div class="template-list">
			{#each data.templates as template (template.id)}
				<a href={resolve(`/admin/parental-consent/templates/${template.id}`)} class="template-row">
					<div>
						<strong>v{template.version} · {template.name}</strong><span
							>Actualizat {formatDate(template.updatedAt)}</span
						>
					</div>
					<span class:active={template.status === 'active'}>{template.status}</span>
				</a>
			{/each}
		</div>
		<form method="POST" action="?/createTemplate" class="inline-form">
			<label>Nume versiune<input name="name" value="Actualizare acord parental" required /></label>
			<label
				>Clonează din<select name="basedOnVersionId"
					><option value={activeTemplate?.id}>Versiunea activă</option
					>{#each data.templates as template (template.id)}<option value={template.id}
							>v{template.version}</option
						>{/each}</select
				></label
			>
			<button>Crează draft</button>
		</form>
	</section>

	<section class="panel">
		<div class="panel-title">
			<div>
				<h2>Identitatea organizației</h2>
				<p>Valorile sunt copiate în snapshot la publicare.</p>
			</div>
			<span>rev. {data.organization.revision}</span>
		</div>
		<form method="POST" action="?/updateOrganization" class="form-grid">
			<input type="hidden" name="revision" value={data.organization.revision} />
			<label
				>Nume<input
					name="name"
					value={data.organization.name}
					disabled={!data.isSuperAdmin}
					required
				/></label
			>
			<label
				>Nume juridic<input
					name="legalName"
					value={data.organization.legalName ?? ''}
					disabled={!data.isSuperAdmin}
				/></label
			>
			<label class="wide"
				>Adresă<textarea name="address" rows="2" disabled={!data.isSuperAdmin}
					>{data.organization.address}</textarea
				></label
			>
			<label
				>E-mail<input
					name="email"
					type="email"
					value={data.organization.email}
					disabled={!data.isSuperAdmin}
					required
				/></label
			>
			<label
				>Telefon<input
					name="phone"
					value={data.organization.phone}
					disabled={!data.isSuperAdmin}
					required
				/></label
			>
			<label
				>Website<input
					name="website"
					value={data.organization.website ?? ''}
					disabled={!data.isSuperAdmin}
				/></label
			>
			{#if data.isSuperAdmin}<button>Salvează identitatea</button>{/if}
		</form>
	</section>

	<section class="panel">
		<div class="panel-title">
			<div>
				<h2>Asset-uri aprobate</h2>
				<p>Doar PNG/JPEG locale; nu sunt acceptate resurse remote.</p>
			</div>
			<span>{data.assets.length} fișiere</span>
		</div>
		<div class="asset-grid">
			{#each data.assets as asset (asset.id)}
				<article>
					<img
						src={resolve(`/admin/parental-consent/assets/${asset.id}/file`)}
						alt={asset.altText}
					/>
					<div>
						<strong>{asset.name}</strong><small
							>{asset.width}×{asset.height} · {(asset.fileSize / 1024).toFixed(1)} KB</small
						><code>{asset.checksumSha256.slice(0, 16)}…</code>
					</div>
					{#if data.isSuperAdmin}<form
							method="POST"
							action="?/deleteAsset"
							onsubmit={(event) =>
								!confirm('Ștergi asset-ul? Operațiunea este blocată dacă este referit.') &&
								event.preventDefault()}
						>
							<input type="hidden" name="assetId" value={asset.id} /><button class="danger"
								>Șterge</button
							>
						</form>{/if}
				</article>
			{/each}
		</div>
		{#if data.isSuperAdmin}
			<form method="POST" action="?/uploadAsset" enctype="multipart/form-data" class="inline-form">
				<label>Nume<input name="name" required /></label><label
					>Text alternativ<input name="altText" required /></label
				><label
					>Imagine<input name="file" type="file" accept="image/png,image/jpeg" required /></label
				><button>Încarcă</button>
			</form>
		{/if}
	</section>
</section>

<style>
	.page {
		display: grid;
		gap: 16px;
		max-width: 1180px;
		margin: 0 auto;
		color: #172033;
	}
	header {
		display: flex;
		justify-content: space-between;
		gap: 20px;
		align-items: end;
	}
	header p {
		max-width: 560px;
		color: #64748b;
	}
	.eyebrow {
		margin: 0;
		color: #991b1b;
		font-size: 0.78rem;
		font-weight: 900;
		text-transform: uppercase;
	}
	h1 {
		margin: 5px 0 0;
	}
	h2 {
		margin: 0;
		font-size: 1.15rem;
	}
	.panel {
		display: grid;
		gap: 14px;
		border: 1px solid #dbe3ef;
		border-radius: 12px;
		background: #fff;
		padding: 18px;
		box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
	}
	.panel-title {
		display: flex;
		justify-content: space-between;
		gap: 14px;
		align-items: start;
	}
	.panel-title p {
		margin: 4px 0 0;
		color: #64748b;
		font-size: 0.9rem;
	}
	.active-chip {
		border-radius: 999px;
		background: #ecfdf5;
		padding: 5px 9px;
		color: #047857;
		font-size: 0.82rem;
		font-weight: 850;
	}
	.template-list {
		display: grid;
		gap: 7px;
	}
	.template-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 11px;
		color: inherit;
		text-decoration: none;
	}
	.template-row:hover {
		border-color: #991b1b;
	}
	.template-row div {
		display: grid;
		gap: 3px;
	}
	.template-row div span {
		color: #64748b;
		font-size: 0.82rem;
	}
	.template-row > span {
		text-transform: uppercase;
		font-size: 0.72rem;
		font-weight: 900;
	}
	.template-row > span.active {
		color: #047857;
	}
	.inline-form,
	.form-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
		gap: 10px;
		align-items: end;
		padding-top: 12px;
		border-top: 1px solid #edf2f7;
	}
	.form-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
		border: 0;
		padding: 0;
	}
	label {
		display: grid;
		gap: 5px;
		font-size: 0.82rem;
		font-weight: 800;
	}
	label.wide {
		grid-column: 1/-1;
	}
	input,
	select,
	textarea,
	button {
		font: inherit;
	}
	input,
	select,
	textarea {
		border: 1px solid #cbd5e1;
		border-radius: 7px;
		padding: 8px;
	}
	button {
		min-height: 38px;
		border: 0;
		border-radius: 7px;
		background: #991b1b;
		padding: 7px 13px;
		color: #fff;
		font-weight: 850;
		cursor: pointer;
	}
	button.danger {
		background: #fff;
		color: #991b1b;
		border: 1px solid #fecaca;
	}
	.asset-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
	}
	.asset-grid article {
		display: grid;
		grid-template-columns: 84px 1fr;
		gap: 10px;
		align-items: center;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 10px;
	}
	.asset-grid img {
		width: 84px;
		height: 64px;
		object-fit: contain;
	}
	.asset-grid article div {
		display: grid;
		gap: 3px;
		min-width: 0;
	}
	small,
	code {
		color: #64748b;
		font-size: 0.72rem;
		overflow: hidden;
	}
	.asset-grid form {
		grid-column: 1/-1;
	}
	.message {
		border-radius: 8px;
		padding: 10px;
	}
	.message.error {
		background: #fef2f2;
		color: #991b1b;
	}
	.message.success {
		background: #ecfdf5;
		color: #047857;
	}
	@media (max-width: 850px) {
		header {
			display: grid;
		}
		.inline-form,
		.form-grid,
		.asset-grid {
			grid-template-columns: 1fr;
		}
		label.wide {
			grid-column: auto;
		}
	}
</style>

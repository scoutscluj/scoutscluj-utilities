<script lang="ts">
	import { resolve } from '$app/paths';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import UserRound from '@lucide/svelte/icons/user-round';
	import Check from '@lucide/svelte/icons/check';
	import { formatRole } from '$lib/auth/roles';
	import type { CurrentUser } from '$lib/auth/types';
	import { formatProfileDate, formatProfileTimestamp } from './types';

	let { user, feePaymentDue = null }: { user: CurrentUser; feePaymentDue?: boolean | null } =
		$props();
	const connection = $derived(user.orgoConnection);
	const profile = $derived(connection?.profile);
	const email = $derived(profile?.email ?? user.email ?? connection?.email);
	const memberStatus = $derived(profile?.status?.trim().toUpperCase());
	const statusLabels: Record<string, string> = {
		ACTIVE: 'Activ',
		INACTIVE: 'Inactiv',
		PENDING: 'În așteptare',
		SUSPENDED: 'Suspendat',
		DELETED: 'Șters'
	};
	const feeState = $derived(
		feePaymentDue === false ? 'paid' : feePaymentDue === true ? 'due' : 'unavailable'
	);
	const showFeePayment = $derived(feePaymentDue !== false);
</script>

{#if showFeePayment}
	<aside class="fee-warning" aria-labelledby="fee-warning-title">
		<TriangleAlert size={20} aria-hidden="true" />
		<div class="fee-warning-copy">
			<h2 id="fee-warning-title">
				{feePaymentDue === true
					? 'Ai o cotizație de achitat'
					: 'Situația cotizației nu este disponibilă'}
			</h2>
			<p>
				{feePaymentDue === true
					? 'Achită cotizația pentru a fi la zi cu plata.'
					: 'Nu am putut determina situația din evidența locală. Verifică detaliile cotizației.'}
			</p>
		</div>
		<a class="fee-payment-link" href={resolve('/cotizatie')}>
			<CreditCard size={16} aria-hidden="true" />{feePaymentDue === true
				? 'Plătește cotizația'
				: 'Vezi cotizația'}
		</a>
	</aside>
{/if}

<div class="profile-cards">
	<section class="profile-card personal-card" aria-labelledby="personal-information-title">
		<header class="card-heading">
			<span class="heading-icon" aria-hidden="true"><UserRound size={20} /></span>
			<h2 id="personal-information-title">Informații personale</h2>
		</header>
		<dl class="personal-details">
			<div class="email-field">
				<dt>Email</dt>
				<dd>
					{#if email}<a href={`mailto:${email}`}>{email}</a>{:else}Indisponibil{/if}
				</dd>
			</div>
			<div>
				<dt>Card ID</dt>
				<dd class="identifier">{connection?.cardId ?? 'Indisponibil'}</dd>
			</div>
			<div>
				<dt>Statut Orgo</dt>
				<dd>
					<span class="member-status" data-status={memberStatus ?? 'unknown'}
						>{memberStatus ? (statusLabels[memberStatus] ?? profile?.status) : 'Indisponibil'}</span
					>
				</dd>
			</div>
			<div>
				<dt>Data nașterii</dt>
				<dd>{formatProfileDate(profile?.dateOfBirth)}</dd>
			</div>
			<div>
				<dt>Membru din</dt>
				<dd>{formatProfileDate(profile?.dateJoined)}</dd>
			</div>
			<div class="fee-field">
				<dt>Cotizație</dt>
				<dd class="fee-value" data-state={feeState}>
					<span class="fee-status"
						>{feePaymentDue === false
							? 'Achitată'
							: feePaymentDue === true
								? 'De achitat'
								: 'Indisponibilă'}</span
					>
				</dd>
			</div>
		</dl>
		<div class="roles-section">
			<h3>Roluri în aplicație</h3>
			{#if user.roles.length}
				<div class="role-badges">
					{#each user.roles as role (role)}<span class="role-badge" data-role={role}
							>{formatRole(role)}</span
						>{/each}
				</div>
			{:else}<p class="no-roles">Membru autentificat fără rol administrativ.</p>{/if}
		</div>
	</section>

	<section class="profile-card orgo-card" aria-labelledby="orgo-information-title">
		<header class="card-heading">
			<span class="heading-icon orgo-symbol"
				><img src="/branding/orgo-symbol.png" alt="" width="25" height="25" /></span
			>
			<h2 id="orgo-information-title">Conexiune Orgo</h2>
		</header>
		<dl class="connection-details">
			<div>
				<dt>Conexiune</dt>
				<dd>
					<span class={['connection-status', { connected: Boolean(connection) }]}
						>{#if connection}<Check size={13} aria-hidden="true" />{/if}{connection
							? 'Conectat'
							: 'Indisponibil'}</span
					>
				</dd>
			</div>
			<div>
				<dt>ID Orgo</dt>
				<dd class="identifier">{connection?.orgoUserId ?? 'Indisponibil'}</dd>
			</div>
			<div>
				<dt>Conectat din</dt>
				<dd>{formatProfileTimestamp(connection?.connectedAt)}</dd>
			</div>
			<div>
				<dt>Ultima autentificare</dt>
				<dd>{formatProfileTimestamp(connection?.lastLoginAt)}</dd>
			</div>
		</dl>
	</section>
</div>

<style>
	.fee-warning {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-top: 20px;
		padding: 14px 16px;
		border: 1px solid #fde68a;
		border-radius: var(--sc-radius);
		background: #fffbeb;
		color: #92400e;
	}
	.fee-warning > :global(svg) {
		flex-shrink: 0;
	}
	.fee-warning-copy {
		flex: 1;
		min-width: 0;
	}
	.fee-warning h2 {
		color: inherit;
		font-size: 14px;
	}
	.fee-warning p {
		margin: 3px 0 0;
		font-size: 13px;
		line-height: 1.5;
	}
	.fee-warning + .profile-cards {
		margin-top: 12px;
	}
	.profile-cards {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
		align-items: stretch;
		gap: 16px;
		margin-top: 20px;
	}
	.profile-card {
		min-width: 0;
		border: 1px solid var(--sc-border);
		border-radius: var(--sc-radius);
		background: var(--sc-surface);
		padding: 16px;
	}
	.card-heading {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 12px;
	}
	.heading-icon {
		width: 28px;
		height: 28px;
		flex-shrink: 0;
		display: grid;
		place-items: center;
		background: var(--sc-inset);
		color: var(--sc-muted);
		border-radius: 9px;
	}
	.orgo-symbol {
		background: transparent;
	}
	h2 {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: var(--sc-ink);
	}
	h3 {
		margin: 0;
		font-size: 12px;
		font-weight: 500;
		color: var(--sc-muted);
	}
	dl,
	dd {
		margin: 0;
	}
	dt {
		color: var(--sc-muted);
		font-size: 12px;
	}
	dd {
		margin-top: 4px;
		font-size: 13px;
		color: var(--sc-ink);
		line-height: 1.5;
		overflow-wrap: anywhere;
	}
	.personal-details {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px 16px;
	}
	.email-field a {
		color: inherit;
		text-decoration: none;
	}
	.email-field a:hover {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.email-field a:focus-visible {
		outline: 2px solid var(--sc-accent);
		outline-offset: 3px;
	}
	.identifier {
		font-variant-numeric: tabular-nums;
	}
	.member-status,
	.connection-status,
	.role-badge,
	.fee-status {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		border-radius: 5px;
		padding: 2px 6px;
		font-size: 12px;
		font-weight: 500;
		line-height: 1.5;
	}
	.fee-payment-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		max-width: 100%;
		flex-shrink: 0;
		min-height: 38px;
		padding: 8px 12px;
		border: 1px solid var(--sc-accent);
		border-radius: 6px;
		background: var(--sc-accent);
		color: white;
		font-size: 13px;
		font-weight: 500;
		text-decoration: none;
	}
	.fee-payment-link:hover {
		background: var(--sc-accent-hover);
		border-color: var(--sc-accent-hover);
	}
	.fee-payment-link:focus-visible {
		outline: 2px solid var(--sc-accent);
		outline-offset: 3px;
	}
	.fee-payment-link :global(svg) {
		flex-shrink: 0;
	}
	.member-status,
	.connection-status {
		background: var(--sc-inset);
		color: var(--sc-muted);
	}
	.member-status[data-status='ACTIVE'],
	.connected {
		background: var(--sc-success-soft);
		color: var(--sc-success);
	}
	.member-status[data-status='PENDING'],
	.member-status[data-status='SUSPENDED'] {
		color: #92400e;
		background: #fffbeb;
	}
	.fee-value {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 4px 6px;
	}
	.fee-status {
		background: var(--sc-success-soft);
		color: var(--sc-success);
	}
	.fee-value[data-state='due'] .fee-status {
		background: #fef3c7;
		color: #92400e;
	}
	.fee-value[data-state='unavailable'] .fee-status {
		background: var(--sc-inset);
		color: var(--sc-muted);
	}
	.roles-section {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px 12px;
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid var(--sc-border);
	}
	.role-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 0;
	}
	.role-badge[data-role='super_admin'] {
		color: #6b21a8;
		background: #f3e8ff;
	}
	.role-badge[data-role='admin'] {
		color: #1e40af;
		background: #eff6ff;
	}
	.role-badge[data-role='finance_manager'] {
		color: #92400e;
		background: #fffbeb;
	}
	.role-badge[data-role='moderator'] {
		color: #0f766e;
		background: #f0fdfa;
	}
	.no-roles {
		color: var(--sc-muted);
		font-size: 13px;
		line-height: 1.5;
		margin: 0;
	}
	.connection-details {
		display: grid;
		gap: 0;
	}
	.connection-details > div {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
		align-items: baseline;
		gap: 16px;
		padding: 8px 0;
		border-bottom: 1px solid var(--sc-border);
	}
	.connection-details > div:first-child {
		padding-top: 0;
	}
	.connection-details > div:last-child {
		padding-bottom: 0;
		border-bottom: 0;
	}
	.connection-details dd {
		margin: 0;
		text-align: right;
	}
	@media (max-width: 1200px) {
		.personal-details {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 740px) {
		.fee-warning {
			align-items: flex-start;
			flex-wrap: wrap;
		}
		.fee-warning-copy {
			flex-basis: calc(100% - 32px);
		}
		.fee-payment-link {
			margin-left: 32px;
		}
		.profile-cards {
			grid-template-columns: minmax(0, 1fr);
			margin-top: 20px;
			gap: 12px;
		}
	}
</style>

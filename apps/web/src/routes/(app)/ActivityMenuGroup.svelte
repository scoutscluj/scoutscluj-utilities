<script lang="ts">
	import type { CurrentUser } from '$lib/auth/types';
	import { resolve } from '$app/paths';
	import {
		activitySettingsSections,
		activitySettingsHref
	} from '$lib/activities/activity-settings';
	import type { SidebarActivity } from '$lib/activities/sidebar-activity';
	import {
		activitiesGroupKey,
		activityHref,
		auditHref,
		canManageActivity,
		canViewActivityAudit,
		departmentLabels,
		financeHref,
		hasDepartment,
		isPathActive,
		kitchenHref,
		menuHref,
		parseCurrentActivityId,
		settingsHref
	} from './app-shell';

	type Props = {
		label: string;
		user: CurrentUser;
		activities: SidebarActivity[];
		pathname: string;
		open: boolean;
		active: boolean;
		toggle: () => void;
		closeMobile: () => void;
	};

	let { label, user, activities, pathname, open, active, toggle, closeMobile }: Props = $props();

	const currentActivityId = $derived(parseCurrentActivityId(pathname));
	const isActiveExact = (href: string) => pathname === href;
</script>

<section class="menu-group activity-menu">
	<div class="activity-heading" class:active>
		<a
			class="group-link"
			href={menuHref('/activities')}
			onclick={closeMobile}
			aria-current={pathname === menuHref('/activities') ? 'page' : undefined}>{label}</a
		>
		<button
			type="button"
			class="group-button"
			class:active
			onclick={toggle}
			aria-expanded={open}
			aria-controls={activitiesGroupKey}
			aria-label="Submeniul Activități"
		>
			<span aria-hidden="true">{open ? '-' : '+'}</span>
		</button>
	</div>

	{#if open}
		<div id={activitiesGroupKey} class="group-items activity-items">
			{#each activities as activity (activity.id)}
				{@const href = activity.publicRegistration
					? resolve(`/activitati/${activity.id}`)
					: activityHref(activity.id)}
				<section class="activity-branch">
					<a
						{href}
						class="activity-link"
						class:active={isPathActive(href, pathname)}
						onclick={closeMobile}
						aria-current={isActiveExact(href) ? 'page' : undefined}
					>
						<span class="activity-title">{activity.title}</span>
					</a>

					{#if !activity.publicRegistration && activity.id === currentActivityId}
						<div class="department-items">
							{#if hasDepartment(activity, 'finance')}<div class="department-feature-group">
									<span class="department-heading">Financiar</span><a
										href={financeHref(activity.id)}
										onclick={closeMobile}>Documente financiare</a
									><a
										href={resolve(`/activities/${activity.id}/finance/participation`)}
										class:active={pathname.includes('/finance/participation')}
										onclick={closeMobile}>Plăți participare</a
									>
								</div>{/if}
							{#if hasDepartment(activity, 'kitchen')}
								<a
									href={kitchenHref(activity.id)}
									class:active={isPathActive(kitchenHref(activity.id), pathname)}
									onclick={closeMobile}
									aria-current={isPathActive(kitchenHref(activity.id), pathname)
										? 'page'
										: undefined}
								>
									{departmentLabels.kitchen}
								</a>
							{/if}
							{#if hasDepartment(activity, 'program')}
								<span class="disabled department-disabled" title="Departament neimplementat încă">
									{departmentLabels.program}
								</span>
							{/if}
							{#if hasDepartment(activity, 'logistics')}
								<span class="disabled department-disabled" title="Departament neimplementat încă">
									{departmentLabels.logistics}
								</span>
							{/if}
							{#if hasDepartment(activity, 'administrative')}
								<div class="department-feature-group">
									<span class="department-heading">{departmentLabels.administrative}</span><a
										class="feature-link"
										href={resolve(`/activities/${activity.id}/registrations`)}
										class:active={pathname.includes('/registrations')}
										onclick={closeMobile}>Înscrieri</a
									>
								</div>
							{/if}
							{#if canManageActivity(activity, user) || canViewActivityAudit(activity, user)}
								<div class="utility-items">
									<span class="utility-label">Util</span>
									{#if canManageActivity(activity, user)}
										<a
											class="utility-link"
											href={settingsHref(activity.id)}
											class:active={isPathActive(settingsHref(activity.id), pathname)}
											onclick={closeMobile}
											aria-current={isPathActive(settingsHref(activity.id), pathname)
												? 'page'
												: undefined}
										>
											Setări
										</a>
										{#if isPathActive(settingsHref(activity.id), pathname)}<div
												class="settings-submenu"
											>
												{#each activitySettingsSections as section (section.key)}
													{@const sectionHref = activitySettingsHref(activity.id, section.key)}
													<a
														href={sectionHref}
														class:active={pathname === sectionHref}
														aria-current={pathname === sectionHref ? 'page' : undefined}
														onclick={closeMobile}>{section.label}</a
													>
												{/each}
											</div>{/if}
									{/if}
									{#if canViewActivityAudit(activity, user)}
										<a
											class="utility-link"
											href={auditHref(activity.id)}
											class:active={isPathActive(auditHref(activity.id), pathname)}
											onclick={closeMobile}
											aria-current={isPathActive(auditHref(activity.id), pathname)
												? 'page'
												: undefined}
										>
											Audit
										</a>
									{/if}
								</div>
							{/if}
						</div>
					{/if}
				</section>
			{/each}
		</div>
	{/if}
</section>

<style>
	.activity-heading {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 38px;
		border-radius: 8px;
	}
	.group-link {
		display: flex;
		align-items: center;
		min-height: 38px;
		padding: 0 12px;
		color: inherit;
		text-decoration: none;
		font-size: 0.94rem;
		font-weight: 600;
		border-radius: 8px;
	}
	.activity-heading .group-button {
		padding: 0;
		justify-content: center;
	}
	.settings-submenu {
		display: grid;
		gap: 4px;
		padding-left: 12px;
		border-left: 1px solid var(--sc-border);
		margin-left: 8px;
	}
	.menu-group,
	.group-items,
	.activity-branch,
	.department-items {
		display: grid;
		gap: 4px;
	}

	.group-button,
	.activity-link,
	.group-items a,
	.department-items a,
	.department-disabled,
	.disabled {
		min-height: 38px;
		display: flex;
		align-items: center;
		border-radius: 8px;
		padding: 0 12px;
		color: var(--sc-ink);
		text-decoration: none;
		font-size: 0.94rem;
		font-weight: 600;
	}

	.group-button,
	.activity-link {
		width: 100%;
		justify-content: space-between;
	}

	.group-button {
		border: 0;
		background: transparent;
		cursor: pointer;
		text-align: left;
	}

	.activity-link {
		min-height: 34px;
		gap: 8px;
		padding: 0 10px;
		font-size: 0.88rem;
	}

	.activity-title {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.group-button:hover,
	.activity-link:hover,
	.group-items a:hover,
	.department-items a:hover,
	.active {
		background: var(--sc-accent-soft);
		color: var(--sc-accent-hover);
	}

	.group-items {
		margin-left: 10px;
		padding-left: 8px;
		border-left: 1px solid var(--sc-border);
	}

	.activity-items {
		gap: 6px;
	}

	.department-items {
		margin-left: 10px;
		padding-left: 8px;
		border-left: 1px solid var(--sc-border);
	}

	.department-feature-group {
		display: grid;
		gap: 2px;
	}

	.department-heading {
		padding: 6px 10px 2px;
		color: #475569;
		font-size: 0.84rem;
		font-weight: 600;
	}

	.department-items a.feature-link {
		margin-left: 12px;
		font-weight: 650;
	}

	.utility-items {
		display: grid;
		gap: 3px;
		margin-top: 4px;
		border-top: 1px solid var(--sc-border);
		padding-top: 5px;
	}

	.utility-label {
		padding: 0 10px;
		color: #94a3b8;
		font-size: 0.66rem;
		font-weight: 600;
		text-transform: uppercase;
	}

	.department-items a {
		min-height: 30px;
		padding: 0 10px;
		color: #475569;
		font-size: 0.84rem;
		font-weight: 720;
	}

	.department-items a.utility-link {
		color: var(--sc-muted);
	}

	.disabled {
		color: #94a3b8;
		cursor: not-allowed;
	}
</style>

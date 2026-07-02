<script lang="ts">
	import type { CurrentUser } from '$lib/auth/types';
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
	<button
		type="button"
		class="group-button"
		class:active
		onclick={toggle}
		aria-expanded={open}
		aria-controls={activitiesGroupKey}
	>
		<span>{label}</span>
		<span aria-hidden="true">{open ? '-' : '+'}</span>
	</button>

	{#if open}
		<div id={activitiesGroupKey} class="group-items activity-items">
			<a
				href={menuHref('/activities')}
				class:active={isActiveExact(menuHref('/activities'))}
				onclick={closeMobile}
				aria-current={isActiveExact(menuHref('/activities')) ? 'page' : undefined}
			>
				Toate activitățile
			</a>

			{#each activities as activity (activity.id)}
				<section class="activity-branch">
					<a
						href={activityHref(activity.id)}
						class="activity-link"
						class:active={activity.id === currentActivityId}
						onclick={closeMobile}
						aria-current={isActiveExact(activityHref(activity.id)) ? 'page' : undefined}
					>
						<span class="activity-title">{activity.title}</span>
					</a>

					{#if activity.id === currentActivityId}
						<div class="department-items">
							{#if hasDepartment(activity, 'finance')}
								<a
									href={financeHref(activity.id)}
									class:active={isPathActive(financeHref(activity.id), pathname)}
									onclick={closeMobile}
									aria-current={isPathActive(financeHref(activity.id), pathname)
										? 'page'
										: undefined}
								>
									{departmentLabels.finance}
								</a>
							{/if}
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
		color: #334155;
		text-decoration: none;
		font-size: 0.94rem;
		font-weight: 750;
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
		background: #fef2f2;
		color: #991b1b;
	}

	.group-items {
		margin-left: 10px;
		padding-left: 8px;
		border-left: 1px solid #e2e8f0;
	}

	.activity-items {
		gap: 6px;
	}

	.department-items {
		margin-left: 10px;
		padding-left: 8px;
		border-left: 1px solid #edf1f5;
	}

	.utility-items {
		display: grid;
		gap: 3px;
		margin-top: 4px;
		border-top: 1px solid #edf1f5;
		padding-top: 5px;
	}

	.utility-label {
		padding: 0 10px;
		color: #94a3b8;
		font-size: 0.66rem;
		font-weight: 900;
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
		color: #64748b;
	}

	.disabled {
		color: #94a3b8;
		cursor: not-allowed;
	}
</style>

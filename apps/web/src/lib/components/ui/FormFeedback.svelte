<script lang="ts">
	import { tick } from 'svelte';
	import AlertCircle from '@lucide/svelte/icons/circle-alert';
	import Info from '@lucide/svelte/icons/info';
	import CheckCircle from '@lucide/svelte/icons/circle-check';
	let {
		message,
		kind = 'error',
		title,
		issues = [],
		onField
	}: {
		message: string;
		kind?: 'error' | 'success' | 'info';
		title?: string;
		issues?: { field: string; label: string; message: string }[];
		onField?: (field: string) => void;
	} = $props();
	let container = $state<HTMLDivElement>();
	$effect(() => {
		if (message && kind === 'error')
			void tick().then(() => {
				container?.scrollIntoView({ block: 'center', behavior: 'smooth' });
				container?.focus({ preventScroll: true });
			});
	});
</script>

{#if message}<div
		bind:this={container}
		class="feedback"
		class:error={kind === 'error'}
		class:success={kind === 'success'}
		role={kind === 'error' ? 'alert' : 'status'}
		tabindex="-1"
	>
		{#if kind === 'error'}<AlertCircle size={22} />{:else if kind === 'success'}<CheckCircle
				size={22}
			/>{:else}<Info size={22} />{/if}
		<div>
			<strong
				>{title ??
					(kind === 'error'
						? 'Verifică informațiile înainte de a continua'
						: kind === 'success'
							? 'Modificările au fost salvate'
							: 'Informații')}</strong
			>
			<p>{message}</p>
			{#if issues.length}<ul>
					{#each issues as issue (issue.field)}<li>
							{#if onField}<button type="button" onclick={() => onField?.(issue.field)}
									>{issue.label}</button
								>{:else}<strong>{issue.label}</strong>{/if}<span> — {issue.message}</span>
						</li>{/each}
				</ul>{/if}
		</div>
	</div>{/if}

<style>
	.feedback {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 16px;
		border: 1px solid var(--sc-border);
		border-left: 4px solid var(--sc-border-strong);
		border-radius: 8px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		line-height: 1.5;
	}
	.feedback:focus {
		outline: 2px solid var(--sc-accent);
		outline-offset: 3px;
	}
	.feedback :global(svg) {
		flex-shrink: 0;
	}
	.error {
		background: var(--sc-accent-soft);
		border-color: var(--sc-accent);
	}
	.error :global(svg) {
		color: var(--sc-accent);
	}
	.success {
		background: var(--sc-success-soft);
		border-color: var(--sc-success);
	}
	.success :global(svg) {
		color: var(--sc-success);
	}
	strong {
		font-weight: 600;
	}
	p {
		margin: 4px 0 0;
		white-space: pre-line;
	}
	ul {
		margin: 8px 0 0;
		padding-left: 20px;
	}
	li + li {
		margin-top: 4px;
	}
	button {
		border: 0;
		background: transparent;
		padding: 2px 0;
		color: var(--sc-accent);
		text-decoration: underline;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
		min-height: 32px;
	}
	button:focus-visible {
		outline: 2px solid var(--sc-accent);
		outline-offset: 2px;
	}
</style>

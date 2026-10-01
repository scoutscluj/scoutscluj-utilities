<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { routeTitle } from '../../app-shell';
	let { children } = $props();
</script>

<div class="finance-admin">
	<nav class="breadcrumb" aria-label="Navigare ierarhică">
		<a href={resolve('/admin')}>Admin</a><span aria-hidden="true">/</span>
		<a href={resolve('/admin/finance')}>Financiar</a>
		{#if page.url.pathname !== resolve('/admin/finance')}
			<span aria-hidden="true">/</span><span aria-current="page"
				>{routeTitle(page.url.pathname)}</span
			>
		{/if}
	</nav>
	{@render children()}
</div>

<style>
	.finance-admin {
		max-width: 1320px;
		margin: 0 auto;
	}
	.breadcrumb {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
		color: #64748b;
		font-size: 0.86rem;
		margin-bottom: 24px;
	}
	.breadcrumb a {
		text-decoration: none;
	}
	.breadcrumb a:hover {
		text-decoration: underline;
	}
	a:focus-visible {
		outline: 3px solid #fca5a5;
		outline-offset: 3px;
	}
</style>

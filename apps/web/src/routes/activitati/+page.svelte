<script lang="ts">
	import { resolve } from '$app/paths';
	let { data } = $props();
</script>

<svelte:head><title>Activități | Scouts Cluj</title></svelte:head>
<main>
	<a href={resolve('/')}>Scouts Cluj</a>
	<h1>Activități</h1>
	<p>Descoperă activitățile, înscrie un participant și achită taxa de participare.</p>
	{#each data.activities as activity (activity.id)}
		<article>
			{#if activity.coverImageUrl}<img
					src={activity.coverImageUrl}
					alt={activity.title}
					loading="lazy"
					referrerpolicy="no-referrer"
				/>{/if}
			<h2><a href={resolve(`/activitati/${activity.id}`)}>{activity.title}</a></h2>
			<p>
				{activity.location}
				{activity.startDate ? new Date(activity.startDate).toLocaleDateString('ro-RO') : ''}
			</p>
			<p>{activity.description}</p>
			<a href={resolve(`/activitati/${activity.id}`)}>Detalii și înscriere →</a>
		</article>
	{:else}<p>Nu sunt activități publicate momentan.</p>{/each}
</main>

<style>
	article img {
		width: 100%;
		max-height: 240px;
		object-fit: cover;
		border-radius: 8px;
	}
	main {
		max-width: 960px;
		margin: 32px auto;
		padding: 24px;
	}
	h1 {
		font-size: 2rem;
	}
	article {
		margin-top: 24px;
		padding: 24px;
		background: var(--sc-surface);
		border: 1px solid var(--sc-border);
		border-radius: 10px;
	}
	a {
		color: var(--sc-accent);
	}
	p {
		line-height: 1.6;
		color: var(--sc-ink-muted);
	}
</style>

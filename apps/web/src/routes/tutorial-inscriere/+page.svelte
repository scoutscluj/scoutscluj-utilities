<script lang="ts">
	import { asset, resolve } from '$app/paths';
	import steps from '$lib/members/registration-tutorial.json';
	let video = $state<HTMLVideoElement>();
	let currentTime = $state(0);
	let playbackMessage = $state('');
	const chapters = steps.map((step, index) => {
		const start = steps.slice(0, index).reduce((sum, item) => sum + item.duration, 0);
		const chapter = { ...step, start, end: start + step.duration };
		return chapter;
	});
	const totalDuration = chapters.at(-1)?.end ?? 0;
	const timestamp = (value: number) =>
		`${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
	async function seek(time: number) {
		if (!video) return;
		video.currentTime = time;
		playbackMessage = '';
		try {
			await video.play();
		} catch {
			playbackMessage = 'Apasă butonul de redare din video pentru a continua.';
		}
	}
</script>

<svelte:head>
	<title>Înscriere și autentificare — tutorial pentru părinți | Scouts Cluj</title>
	<meta
		name="description"
		content="Pașii înscrierii copilului în Scouts Cluj și autentificării în Resurse prin Orgo: tutorial video cu muzică instrumentală și explicații pe ecran."
	/>
</svelte:head>
<main>
	<a class="back" href={resolve('/register')}>← Formularul de înscriere</a>
	<header>
		<p class="eyebrow">Ghid pentru părinți</p>
		<h1>Înscrierea copilului și accesul în Resurse</h1>
		<p class="intro">
			De la completarea cererii până la autentificare. Durată: {timestamp(totalDuration)}. Muzică
			instrumentală și explicații pe ecran, fără voce.
		</p>
	</header>
	<section class="player" aria-label="Tutorial video">
		<video
			bind:this={video}
			bind:currentTime
			controls
			playsinline
			preload="metadata"
			poster={asset('/tutoriale/inscriere-parinti-poster.webp')}
			width="1600"
			height="900"
			aria-label="Tutorial pentru părinți: înscriere și autentificare în Resurse"
		>
			<source src={asset('/tutoriale/inscriere-parinti.mp4')} type="video/mp4" />
			<track
				kind="captions"
				src={asset('/tutoriale/inscriere-parinti.ro.vtt')}
				srclang="ro"
				label="Română — explicații"
			/>
			<track
				kind="chapters"
				src={asset('/tutoriale/inscriere-parinti.chapters.vtt')}
				srclang="ro"
				label="Capitole"
			/>
			<a href={asset('/tutoriale/inscriere-parinti.mp4')}>Deschide fișierul video</a>.
		</video>
	</section>
	<p class="viewing-hint">
		Pe telefon, rotește ecranul și folosește vizualizarea pe tot ecranul. Poți citi aceiași pași și
		mai jos.
	</p>
	{#if playbackMessage}<p role="status">{playbackMessage}</p>{/if}
	<nav aria-label="Capitolele tutorialului">
		{#each chapters as chapter (chapter.id)}
			<button
				type="button"
				aria-current={currentTime >= chapter.start && currentTime < chapter.end
					? 'step'
					: undefined}
				onclick={() => seek(chapter.start)}
				><span>{timestamp(chapter.start)}</span>{chapter.title}</button
			>
		{/each}
	</nav>
	<div class="actions">
		<a class="primary" href={resolve('/register')}>Completează înscrierea</a><a
			href={resolve('/login')}>Mergi la autentificare</a
		>
	</div>
	<details>
		<summary>Citește pașii în format text</summary>
		<ol>
			{#each chapters.filter((c) => c.id !== 'cover') as chapter (chapter.id)}<li>
					<h2>{chapter.title}</h2>
					<ul>
						{#each chapter.points as point (point)}<li>{point}</li>{/each}
					</ul>
				</li>{/each}
		</ol>
	</details>
	<p class="contact">
		Ai nevoie de ajutor? Contactează liderul sau <a href="mailto:cluj.napoca@scout.ro"
			>centrul local</a
		>.
	</p>
</main>

<style>
	main {
		max-width: 1120px;
		margin: 0 auto;
		padding: 32px 24px 64px;
		color: var(--sc-ink);
	}
	a {
		color: var(--sc-accent);
	}
	.back {
		font-size: 14px;
	}
	header {
		margin: 32px 0 24px;
	}
	.eyebrow {
		color: var(--sc-muted);
		font-size: 13px;
		font-weight: 600;
		margin: 0 0 8px;
	}
	h1 {
		font-size: clamp(26px, 4vw, 36px);
		line-height: 1.15;
		letter-spacing: -0.025em;
		margin: 0 0 16px;
		max-width: 800px;
	}
	.intro {
		color: var(--sc-muted);
		font-size: 16px;
		line-height: 1.6;
		max-width: 800px;
		margin: 0;
	}
	.player {
		border: 1px solid var(--sc-border);
		border-radius: 12px;
		overflow: hidden;
		background: var(--sc-surface);
	}
	video {
		display: block;
		width: 100%;
		height: auto;
		aspect-ratio: 16 / 9;
	}
	.viewing-hint {
		color: var(--sc-muted);
		font-size: 13px;
		line-height: 1.5;
		margin: 12px 0 24px;
	}
	nav {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
	}
	button {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		text-align: left;
		min-height: 48px;
		padding: 12px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		background: var(--sc-surface);
		color: var(--sc-ink);
		font: inherit;
		font-size: 13px;
		line-height: 1.45;
		cursor: pointer;
	}
	button span {
		font-variant-numeric: tabular-nums;
		color: var(--sc-muted);
		flex-shrink: 0;
	}
	button[aria-current='step'] {
		border-color: var(--sc-accent);
		background: var(--sc-accent-soft);
	}
	button:hover {
		border-color: var(--sc-accent);
	}
	button:focus-visible,
	a:focus-visible,
	summary:focus-visible {
		outline: 2px solid var(--sc-accent);
		outline-offset: 3px;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin: 28px 0;
	}
	.actions a {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		padding: 10px 16px;
		border: 1px solid var(--sc-border);
		border-radius: 7px;
		font-size: 14px;
		font-weight: 600;
		text-decoration: none;
		background: var(--sc-surface);
	}
	.actions .primary {
		background: var(--sc-accent);
		border-color: var(--sc-accent);
		color: var(--sc-surface);
	}
	details {
		border-top: 1px solid var(--sc-border);
		border-bottom: 1px solid var(--sc-border);
		padding: 20px 0;
	}
	summary {
		cursor: pointer;
		font-size: 16px;
		font-weight: 600;
	}
	ol {
		padding-left: 24px;
		margin-top: 24px;
	}
	ol > li {
		padding-left: 8px;
		margin-bottom: 24px;
	}
	h2 {
		font-size: 17px;
		margin: 0 0 8px;
	}
	ul {
		padding-left: 18px;
		color: var(--sc-muted);
		line-height: 1.65;
		font-size: 15px;
	}
	.contact {
		color: var(--sc-muted);
		font-size: 14px;
		margin: 24px 0 0;
	}
	@media (max-width: 700px) {
		main {
			padding: 24px 16px 40px;
		}
		nav {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.actions a {
			flex: 1;
		}
	}
	@media (max-width: 420px) {
		nav {
			grid-template-columns: 1fr;
		}
	}
</style>

<script lang="ts">
	import type { HTMLIframeAttributes } from 'svelte/elements';

	type FrameSize = number | string;
	type Props = Omit<HTMLIframeAttributes, 'src' | 'width' | 'height' | 'title'> & {
		url: string;
		width?: FrameSize;
		height?: FrameSize;
		title?: string;
	};

	let {
		url,
		width = '100%',
		height = '93%',
		title = 'Embedded content',
		loading = 'lazy',
		style,
		...rest
	}: Props = $props();

	const toCssSize = (value: FrameSize) => (typeof value === 'number' ? `${value}px` : value);
	const frameStyle = $derived(
		[
			'display: block',
			'max-width: 100%',
			'border: 0',
			style,
			`width: ${toCssSize(width)}`,
			`height: ${toCssSize(height)}`
		]
			.filter(Boolean)
			.join('; ')
	);
</script>

<iframe {...rest} src={url} {title} {loading} style={frameStyle}></iframe>

<script lang="ts">
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import { refreshNationalFees, type NationalFeeResult } from './national-fees';
	let {
		memberIds,
		refreshToken,
		onUpdate
	}: {
		memberIds: string[];
		refreshToken: unknown;
		onUpdate: (results: NationalFeeResult[]) => void;
	} = $props();
	let checked = $state(0),
		failures = $state(0),
		running = $state(false);
	let retry = $state(0);
	$effect(() => {
		const ids = memberIds;
		void refreshToken;
		void retry;
		const controller = new AbortController();
		untrack(() => {
			checked = 0;
			failures = 0;
			running = ids.length > 0;
			void refreshNationalFees(
				ids,
				controller.signal,
				(results) => {
					checked += results.length;
					failures += results.filter((r) => r.state === 'failed').length;
					onUpdate(results);
				},
				fetch,
				resolve('/units/fees')
			)
				.catch(() => {
					if (!controller.signal.aborted) failures++;
				})
				.finally(() => {
					if (!controller.signal.aborted) running = false;
				});
		});
		return () => controller.abort();
	});
</script>

{#if memberIds.length}
	<p role="status" aria-live="polite">
		{#if running}Se verifică cotizațiile în Orgo… {checked}/{memberIds.length}
		{:else if failures}Unele cotizații nu au putut fi verificate în Orgo. Se păstrează situația
			salvată.
			<button type="button" onclick={() => retry++}>Reîncearcă verificarea</button>
		{:else}Cotizațiile au fost verificate în Orgo.{/if}
	</p>
{/if}

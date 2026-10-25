import { createRawSnippet } from 'svelte';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, expect, it } from 'vitest';
import TableView from './TableView.svelte';
afterEach(cleanup);

it('filters and pages existing rows while preserving links and editable controls', async () => {
	const children = createRawSnippet(() => ({
		render: () =>
			`<table><thead><tr><th>Membru</th></tr></thead><tbody>${Array.from({ length: 30 }, (_, i) => `<tr><td><a href="/units/${i}">${i === 29 ? 'Ștefan' : 'Membru'} ${i + 1}</a><input name="record-${i}" value="saved-${i}" /></td></tr>`).join('')}</tbody></table>`
	}));
	const { container } = render(TableView, { children });
	await waitFor(() =>
		expect(container.querySelectorAll('tbody tr:not([hidden])')).toHaveLength(25)
	);
	await fireEvent.click(screen.getByRole('button', { name: 'Pagina următoare' }));
	await waitFor(() => expect(container.querySelectorAll('tbody tr:not([hidden])')).toHaveLength(5));
	await fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'stefan' } });
	await waitFor(() => expect(container.querySelectorAll('tbody tr:not([hidden])')).toHaveLength(1));
	expect(screen.getByRole('link', { name: 'Ștefan 30' })).toHaveAttribute('href', '/units/29');
	expect(container.querySelectorAll('input[name]')).toHaveLength(30);
	await fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'no-match' } });
	await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Niciun rezultat'));
	await fireEvent.input(screen.getByRole('searchbox'), { target: { value: '' } });
	await waitFor(() =>
		expect(container.querySelectorAll('tbody tr:not([hidden])')).toHaveLength(25)
	);
});

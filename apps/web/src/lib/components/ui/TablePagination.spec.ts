import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, expect, it, vi } from 'vitest';
import TablePagination from './TablePagination.svelte';
afterEach(cleanup);

it('navigates bounded pages with accessible icon controls and resets for a new size', async () => {
	const onchange = vi.fn();
	render(TablePagination, { total: 53, page: 0, pageSize: 25, onchange });
	expect(screen.getByText('1–25 din 53')).toBeInTheDocument();
	expect(screen.getByRole('button', { name: 'Prima pagină' })).toBeDisabled();
	await fireEvent.click(screen.getByRole('button', { name: 'Ultima pagină' }));
	expect(onchange).toHaveBeenLastCalledWith(2, 25);
	expect(screen.getByText('51–53 din 53')).toBeInTheDocument();
	expect(screen.getByRole('button', { name: 'Pagina următoare' })).toBeDisabled();
	await fireEvent.change(screen.getByRole('combobox', { name: 'Rânduri pe pagină' }), {
		target: { value: '10' }
	});
	expect(onchange).toHaveBeenLastCalledWith(0, 10);
	expect(screen.getByText('1–10 din 53')).toBeInTheDocument();
});

it('keeps empty and all-result ranges valid', async () => {
	const { rerender } = render(TablePagination, { total: 0, page: 9, pageSize: 25 });
	expect(screen.getByText('0–0 din 0')).toBeInTheDocument();
	for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
	await rerender({ total: 53, page: 9, pageSize: 0 });
	expect(screen.getByText('1–53 din 53')).toBeInTheDocument();
});

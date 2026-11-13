import { expect, it, vi } from 'vitest';
const memberRead = vi.hoisted(() => vi.fn());
vi.mock('$lib/server/members', () => ({ memberRead, memberAction: vi.fn() }));
import { load } from '../../routes/(app)/units/[memberId]/+page.server';

it('loads the member immediately using local detail and scoped context, without awaiting Orgo', async () => {
	const reads: string[] = [];
	memberRead.mockImplementation(async (_event, path: string) => {
		reads.push(path);
		return path.endsWith('/context') ? { units: [], members: [] } : { member: { id: 'member' } };
	});
	const result = await load({ params: { memberId: 'member' }, setHeaders: vi.fn() } as never);
	expect(reads).toEqual(['/member/context', '/member']);
	expect(result).toMatchObject({ detail: { member: { id: 'member' } } });
});

import { createServer, type Server } from 'node:http';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { expect, it, vi } from 'vitest';
import { apiFetch } from '$lib/server/api';
import { GET } from './+server';

vi.mock('$lib/server/api', () => ({ apiFetch: vi.fn() }));

const listen = (server: Server) =>
	new Promise<string>((resolve) => {
		server.listen(0, '127.0.0.1', () => {
			const address = server.address();
			if (address && typeof address !== 'string') resolve(`http://127.0.0.1:${address.port}`);
		});
	});
const close = (server: Server) =>
	new Promise<void>((resolve, reject) =>
		server.close((error) => (error ? reject(error) : resolve()))
	);

it.each(['gzip', 'br'] as const)(
	'serves complete decoded dossier JSON after a %s upstream response',
	async (encoding) => {
		const dossier = {
			name: 'Membru de test',
			documents: [
				{
					filename: 'certificat-integritate.pdf',
					status: 'pending',
					description: 'Certificat de integritate comportamentală. '.repeat(30)
				}
			]
		};
		const raw = Buffer.from(JSON.stringify(dossier));
		const compressed = encoding === 'gzip' ? gzipSync(raw) : brotliCompressSync(raw);
		const upstream = createServer((_request, response) => {
			response.writeHead(200, {
				'content-type': 'application/json',
				'content-encoding': encoding,
				'content-length': compressed.length
			});
			response.end(compressed);
		});
		const apiUrl = await listen(upstream);
		vi.mocked(apiFetch).mockImplementation(() => fetch(apiUrl));
		const downstream = createServer(async (_request, response) => {
			const url = new URL(
				'http://localhost/adult-documents/members/11111111-1111-4111-8111-111111111111'
			);
			const result = await GET({
				request: new Request(url),
				url,
				params: { path: 'members/11111111-1111-4111-8111-111111111111' },
				locals: { user: { id: 1 } },
				cookies: { get: () => 'synthetic-session' }
			} as unknown as Parameters<typeof GET>[0]);
			response.writeHead(result.status, Object.fromEntries(result.headers));
			response.end(Buffer.from(await result.arrayBuffer()));
		});
		try {
			const url = await listen(downstream);
			const response = await fetch(url);
			expect(await response.json()).toEqual(dossier);
			expect(response.headers.get('cache-control')).toContain('no-store');
		} finally {
			await close(downstream);
			await close(upstream);
			vi.clearAllMocks();
		}
	}
);

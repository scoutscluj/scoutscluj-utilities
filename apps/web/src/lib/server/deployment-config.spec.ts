import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type WorkspacePackage = {
	scripts?: Record<string, string>;
};

describe('web deployment configuration', () => {
	it('pins the public origin behind the AWS reverse proxy without disabling CSRF', () => {
		const script = readFileSync(resolve(process.cwd(), '../../deploy/ec2-deploy.sh'), 'utf8');
		expect(script).toContain('write_env_value "${WEB_ENV_FILE}" ORIGIN "${WEB_ORIGIN}"');
	});
	it('allows the advertised 15 MB upload in Railway and AWS production', () => {
		const packageJson = JSON.parse(
			readFileSync(resolve(process.cwd(), '../../package.json'), 'utf8')
		) as WorkspacePackage;
		const awsDeployScript = readFileSync(
			resolve(process.cwd(), '../../deploy/ec2-deploy.sh'),
			'utf8'
		);

		expect(packageJson.scripts?.['railway:start:web']).toMatch(
			/(?:^|\s)BODY_SIZE_LIMIT=16M(?:\s|$)/
		);
		expect(awsDeployScript).toContain('write_env_value "${WEB_ENV_FILE}" BODY_SIZE_LIMIT 16M');
	});
});

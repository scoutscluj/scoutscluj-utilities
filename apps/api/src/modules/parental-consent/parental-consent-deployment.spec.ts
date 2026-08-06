import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const repositoryPath = resolve(__dirname, '../../../../..');

describe('parental consent production runtime', () => {
  it('uses the browser image matching the API Playwright version', async () => {
    const [dockerfile, packageJson] = await Promise.all([
      readFile(resolve(repositoryPath, 'deploy/docker/api.Dockerfile'), 'utf8'),
      readFile(resolve(repositoryPath, 'apps/api/package.json'), 'utf8'),
    ]);
    const playwrightVersion = (
      JSON.parse(packageJson) as { dependencies: { playwright: string } }
    ).dependencies.playwright;

    expect(dockerfile).toContain(
      `FROM mcr.microsoft.com/playwright:v${playwrightVersion}-noble AS runtime`,
    );
    expect(dockerfile).toContain(
      'ENV PLAYWRIGHT_BROWSERS_PATH="/ms-playwright"',
    );
  });
});

import 'reflect-metadata';
import { parseImportArguments, runInventoryImport } from './inventory-import';

const formatError = (error: unknown) => {
  const messages: string[] = [];
  const seen = new Set<unknown>();
  let current = error;

  while (current && !seen.has(current)) {
    seen.add(current);
    if (current instanceof Error) {
      const code = (current as Error & { code?: unknown }).code;
      messages.push(
        `${typeof code === 'string' ? `${code}: ` : ''}${current.message}`,
      );
      current = current.cause;
      continue;
    }
    messages.push(
      typeof current === 'string' ||
        typeof current === 'number' ||
        typeof current === 'boolean'
        ? String(current)
        : 'Unknown error',
    );
    break;
  }

  return messages.join('\nCaused by: ');
};

const main = async () => {
  const options = parseImportArguments(process.argv.slice(2));
  const result = await runInventoryImport(options);

  if (options.downloadOnly) {
    console.log(
      `Downloaded ${result.images} images for ${result.items} inventory items.`,
    );
    return;
  }

  if (result.sqlOutputPath) {
    console.log(
      `Generated SQL for ${result.items} inventory items and ${result.images} images.`,
    );
    console.log(`SQL migration: ${result.sqlOutputPath}`);
    return;
  }

  console.log(
    `Imported ${result.items} inventory items and ${result.images} images into PostgreSQL.`,
  );
  console.log(`Firestore/PostgreSQL ID mapping: ${result.reportPath}`);
};

void main().catch((error: unknown) => {
  console.error(formatError(error));
  process.exitCode = 1;
});

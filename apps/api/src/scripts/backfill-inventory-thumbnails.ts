import { config as loadEnv } from 'dotenv';
import {
  parseInventoryThumbnailBackfillArguments,
  runInventoryThumbnailBackfill,
} from './inventory-thumbnail-backfill';

loadEnv({ path: '../../.env.local' });
loadEnv({ path: '../../.env' });
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const main = async () => {
  const options = parseInventoryThumbnailBackfillArguments(
    process.argv.slice(2),
  );
  const result = await runInventoryThumbnailBackfill(options);
  console.log(
    `Thumbnail backfill scanned ${result.scanned}, processed ${result.processed}, and failed ${result.failed}.`,
  );
  console.log(`Report: ${options.reportPath}`);
  if (result.failed > 0) process.exitCode = 1;
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

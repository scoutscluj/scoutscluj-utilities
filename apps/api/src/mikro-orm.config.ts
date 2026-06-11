import { config as loadEnv } from 'dotenv';
import { createMikroOrmOptions } from './config/database.config';

loadEnv({ path: '../../.env.local' });
loadEnv({ path: '../../.env' });
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

export default createMikroOrmOptions();

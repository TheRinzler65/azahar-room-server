import path from 'path';
import dotenv from 'dotenv';

export function loadEnv() {
    const isProd = process.env.NODE_ENV === 'production';
    const file = isProd ? '.env.production' : '.env.local';
    const resolved = path.join(process.cwd(), file);
    dotenv.config({ path: resolved, override: false });
}
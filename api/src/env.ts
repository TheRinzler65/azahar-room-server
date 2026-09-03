import path from 'path';
import dotenv from 'dotenv';

// Charge le fichier .env selon l'environnement :
//   NODE_ENV=production -> .env.production
//   sinon              -> .env.local        (développement local)
// Priorité : vrais variables d'environnement > fichier chargé.
export function loadEnv() {
    const isProd = process.env.NODE_ENV === 'production';
    const file = isProd ? '.env.production' : '.env.local';
    const resolved = path.join(process.cwd(), file);
    dotenv.config({ path: resolved, override: false });
}
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

async function generateVersion() {
  const repo = "TheRinzler65/azahar-room-server";
  let version = "v-dev";

  try {
    const currentCommit = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
    const shortCommit = currentCommit.substring(0, 7);

    const res = await fetch(`https://api.github.com/repos/${repo}/tags`, {
      headers: { "User-Agent": "Azahar-App-Build" },
    });

    if (res.ok) {
      const tags = await res.json();
      if (Array.isArray(tags) && tags.length > 0) {
        const matchingTag = tags.find((t: any) => t.commit?.sha === currentCommit);

        if (matchingTag) {
          version = matchingTag.name;
        } else {
          const latestTag = tags[0].name;
          version = `${latestTag}-${shortCommit}`;
        }
      } else {
        version = `dev-${shortCommit}`;
      }
    } else {
      version = `dev-${shortCommit}`;
    }
  } catch (e) {
    console.warn("Impossible de récupérer les tags GitHub, utilisation d'une version de secours.", e);
    try {
      const fallbackCommit = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
      version = `dev-${fallbackCommit}`;
    } catch {
      version = "dev";
    }
  }

  const envPath = path.resolve(process.cwd(), ".env");
  let envContent = "";

  // Lire le contenu actuel du .env s'il existe déjà
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
  }

  const newVarLine = `VITE_APP_VERSION=${version}`;

  if (envContent.includes("VITE_APP_VERSION=")) {
    envContent = envContent.replace(/^VITE_APP_VERSION=.*$/m, newVarLine);
  } else {
    envContent = envContent.trim() ? `${envContent.trim()}\n${newVarLine}\n` : `${newVarLine}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log(`[Version Generator] Version générée et injectée : ${version}`);
}

generateVersion();
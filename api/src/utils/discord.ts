import https from 'https';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';

export function notifyDiscord(content: string) {
    if (!DISCORD_WEBHOOK_URL) return;

    const body = JSON.stringify({ content: `**[AZAHAR]** ${content}` });
    const url = new URL(DISCORD_WEBHOOK_URL);

    const req = https.request({
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        }
    }, () => {});

    req.on('error', (e: any) => console.log(`[Discord] Webhook failed: ${e.message}`));
    req.write(body);
    req.end();
}
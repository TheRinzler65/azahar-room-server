import { loadEnv } from '../env';

loadEnv();

const BOT_NAME = 'Azahar Sentinel';
const BOT_AVATAR = 'https://raw.githubusercontent.com/azahar-emu/azahar/master/dist/azahar.png';

export type AlertLevel = 'info' | 'warn' | 'error' | 'success' | 'critical';

const THEMES: Record<AlertLevel, { color: number; icon: string }> = {
    info:     { color: 0x38bdf8, icon: 'ℹ️' },   // Sky Blue
    warn:     { color: 0xf59e0b, icon: '⚠️' },   // Amber
    error:    { color: 0xef4444, icon: '🔨' },   // Red
    success:  { color: 0x10b981, icon: '✅' },   // Emerald
    critical: { color: 0x7f1d1d, icon: '🚨' },   // Dark Red / Alarm
};

interface EmbedField {
    name: string;
    value: string;
    inline?: boolean;
}

interface WebhookOptions {
    title: string;
    description?: string;
    level?: AlertLevel;
    fields?: EmbedField[];
}

const queue: Record<string, any>[] = [];
let isProcessing = false;

function getWebhookUrl(): string {
    return process.env.DISCORD_WEBHOOK_URL || '';
}

async function processQueue(): Promise<void> {
    const webhookUrl = getWebhookUrl();
    if (isProcessing || queue.length === 0 || !webhookUrl) return;
    isProcessing = true;

    while (queue.length > 0) {
        const payload = queue[0];

        try {
            const res = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.status === 429) {
                const retryData = (await res.json().catch(() => ({ retry_after: 2 }))) as { retry_after?: number };
                const waitTime = Math.ceil((retryData.retry_after || 2) * 1000);
                console.warn(`[Discord Webhook] Rate limited. Retrying after ${waitTime}ms...`);
                await new Promise((resolve) => setTimeout(resolve, waitTime));
                continue;
            }

            if (!res.ok) {
                console.error(`[Discord Webhook] Server responded with status ${res.status}: ${res.statusText}`);
            }

            queue.shift();
        } catch (err: any) {
            console.error(`[Discord Webhook] Connection error: ${err.message}`);
            queue.shift();
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
    }

    isProcessing = false;
}

export async function sendDiscordEmbed(opts: WebhookOptions): Promise<void> {
    if (!getWebhookUrl()) return;

    const theme = THEMES[opts.level || 'info'];

    const payload = {
        username: BOT_NAME,
        avatar_url: BOT_AVATAR,
        embeds: [
            {
                title: `${theme.icon} ${opts.title}`,
                description: opts.description || '',
                color: theme.color,
                fields: opts.fields || [],
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'Azahar Master Server • Infrastructure Node',
                },
            },
        ],
    };

    queue.push(payload);
    processQueue();
}

export async function notifyBan(
    type: string,
    value: string,
    reason?: string,
    duration?: string,
    admin: string = 'admin'
): Promise<void> {
    const isPermanent = !duration || duration.toLowerCase().includes('permanent');

    await sendDiscordEmbed({
        title: `Player Enforcement: ${type.toUpperCase()} Banned`,
        level: 'error',
        description: `An administrative action has taken effect on the network.`,
        fields: [
            { name: 'Target', value: `\`${value}\``, inline: true },
            { name: 'Type', value: `\`${type}\``, inline: true },
            { name: 'Duration', value: isPermanent ? '🔴 **Permanent**' : `⏳ **${duration}**`, inline: true },
            { name: 'Enforced By', value: `\`${admin}\``, inline: true },
            { name: 'Reason', value: reason ? `> ${reason}` : '_No reason specified_', inline: false },
        ],
    });
}

export async function notifyRoomCrash(
    roomName: string,
    attempts: number,
    maxAttempts: number
): Promise<void> {
    const isExhausted = attempts >= maxAttempts;
    const progressTotal = 6;
    const filled = Math.min(Math.round((attempts / maxAttempts) * progressTotal), progressTotal);
    const progressBar = `\`[${'■'.repeat(filled)}${' '.repeat(progressTotal - filled)}]\``;

    await sendDiscordEmbed({
        title: isExhausted ? 'Room Crash Loop: Process Terminated' : 'Room Crash Detected: Restarting',
        level: isExhausted ? 'critical' : 'warn',
        description: `Sub-process for room **${roomName}** exited unexpectedly.`,
        fields: [
            { name: 'Room', value: `\`${roomName}\``, inline: true },
            { name: 'Restart Progress', value: `${progressBar} (${attempts}/${maxAttempts})`, inline: true },
            {
                name: 'Action',
                value: isExhausted
                    ? '⛔ **Auto-restart disabled.** Manual investigation required.'
                    : '🔄 **Exponential backoff active.** Next restart scheduled.',
                inline: false,
            },
        ],
    });
}

export async function notifyRoomStatus(
    roomName: string,
    status: 'started' | 'stopped',
    port: number
): Promise<void> {
    const isStarted = status === 'started';

    await sendDiscordEmbed({
        title: isStarted ? 'Instance Online' : 'Instance Offline',
        level: isStarted ? 'success' : 'info',
        fields: [
            { name: 'Room Name', value: `**${roomName}**`, inline: true },
            { name: 'Port', value: `\`${port}\``, inline: true },
            { name: 'Direct Connect', value: `\`<server-ip>:${port}\``, inline: false },
        ],
    });
}

export async function notifySecurityEvent(
    action: 'LOGIN_FAILED' | 'ACCESS_DENIED' | 'ADMIN_LOGIN',
    ip: string,
    details?: string
): Promise<void> {
    const isSuspicious = action !== 'ADMIN_LOGIN';

    await sendDiscordEmbed({
        title: isSuspicious ? 'Security Warning: Authentication' : 'Admin Session Authenticated',
        level: isSuspicious ? 'warn' : 'info',
        fields: [
            { name: 'Event', value: `\`${action}\``, inline: true },
            { name: 'Origin IP', value: `\`${ip}\``, inline: true },
            { name: 'Details', value: details || '_N/A_', inline: false },
        ],
    });
}

export async function notifyDiscord(content: string): Promise<void> {
    if (!getWebhookUrl()) return;
    await sendDiscordEmbed({
        title: 'System Notice',
        description: content,
        level: 'info',
    });
}
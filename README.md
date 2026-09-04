# azahar-room-server

Self-hosted multiplayer master server for the **Azahar** 3DS emulator (Citra fork).
A Node.js/TypeScript API + a React admin dashboard for managing rooms, players, bans, audit logs, and live chat.

---

## Features

- **Room orchestration** – Spawn, monitor, and auto-restart `azahar-room` instances with exponential backoff.
- **Lobby system** – Emulator-integrated room discovery with real-time player counts and hex game ID tracking.
- **Chat relay** – In-game messages from emulator processes streamed live to the admin dashboard via WebSockets.
- **Audit logs** – Dedicated admin action tracing (logins, bans, room modifications, IP addresses).
- **Discord webhooks** – Rich embed notifications with automatic rate-limit queueing for bans, crashes, and server events.
- **Ban management** – Manual & threshold-based automated bans synchronized to the emulator banlist file.
- **JWT authentication** – Secure role-based tokens for both dashboard operations and emulator client requests.
- **Direct connection workflow** – Built-in clipboard integration to copy room host:port addresses directly into the emulator.

---

## Tech stack

| Layer | Tech |
|---|---|
| API | Node.js, Express, TypeScript, MySQL2 |
| Dashboard | React, Vite, TailwindCSS |
| Real-time | WebSocket (`ws`) |
| Notifications | Discord Webhooks |
| Process mgmt | PM2 / Child processes |

---

## Quick start (development)

```bash
# 1. Clone repository
git clone https://github.com/TheRinzler65/azahar-room-server.git
cd azahar-room-server

# 2. Install dependencies
cd api && npm install
cd ../dashboard && npm install

# 3. Setup local environment
cd ../api
cp .env.local.example .env.local
# Configure your local MySQL credentials and ADMIN_TOKEN in .env.local

# 4. Create database (schema migrations run automatically on API start)
mysql -u root -e "CREATE DATABASE IF NOT EXISTS azahar_master CHARACTER SET utf8mb4"

# 5. Run development servers
# Terminal 1 (API)
cd api && npm run dev

# Terminal 2 (Dashboard)
cd dashboard && npm run dev
```

Dashboard → http://localhost:5173

API → http://localhost:3000

---

## Initial Setup (Bootstrap)

To host dedicated emulator rooms managed by the server backend:

1. **Initial boot**: Start the API with `ROOM_TOKEN=` empty in your `.env`. Database tables are initialized automatically.
2. **Register admin**: Create your account on the dashboard.
3. **Retrieve token**: Copy your `citra_token` from your profile page or run:

```sql
SELECT citra_token FROM users WHERE username = 'YourUsername';
```

4. **Update config**: Set `ROOM_USERNAME` and `ROOM_TOKEN` in your environment file (`.env.local` or `.env.production`).
5. **Restart**: Reload the API to enable instance spawning.
6. **Configure rooms**: Go to Admin → Rooms to create configs that automatically spawn `azahar-room` processes.

---

## Production deployment

```bash
# 1. Compile both workspaces
cd api && npm run build
cd ../dashboard && npm run build

# 2. Configure production environment
cd ../api
cp .env.production.example .env.production
# Ensure ADMIN_TOKEN, ROOM_BINARY, and DISCORD_WEBHOOK_URL are properly configured

# 3. Start with PM2
pm2 start ecosystem.config.js
pm2 save
```

**Security warning**: The API will refuse to start in production if `ADMIN_TOKEN` is unset or left to the default value. Never commit `.env.production`, `.env.local` or private keys.

---

## Project structure

```
azahar-room-server/
├── api/
│   ├── src/
│   │   ├── db/              # MySQL tables (rooms, bans, audit, users, chat)
│   │   ├── middleware/      # Auth & admin checks
│   │   ├── routes/          # REST endpoints (/admin, /rooms, /chat)
│   │   ├── utils/           # Discord webhooks, banfile sync, chat filter
│   │   ├── env.ts           # Automatic environment loader
│   │   ├── roomManager.ts   # Process lifecycle & crash restart logic
│   │   └── ws.ts            # WebSocket event broadcaster
│   ├── ecosystem.config.js  # PM2 runtime configuration
│   └── package.json
└── dashboard/
    ├── src/
    │   ├── pages/           # Home, Play, Profile, Admin views
    │   │   └── admin/       # Audit, Bans, Chat, Rooms, Lobby
    │   ├── components/      # UI primitives & data tables
    │   └── utils/           # Auth tokens & game hex conversions
    └── package.json
```

---

## Environment configuration

| Variable | Description | Default / Example |
|---|---|---|
| `NODE_ENV` | Runtime mode (`production` / `development`) | `development` |
| `ADMIN_TOKEN` | Master password for `/admin/login` | Required in production |
| `DISCORD_WEBHOOK_URL` | Channel webhook for crash & ban alerts | `https://discord.com/api/webhooks/...` |
| `ROOM_BINARY` | Path to the azahar-room executable | `/opt/azahar/azahar-room` |
| `BANLIST_PATH` | Sync path for the plaintext banlist | `/opt/azahar/banlist.txt` |

---

## License

MIT
# azahar-room-server

Self-hosted multiplayer master server for the **Azahar** 3DS emulator (Citra fork).  
A Node.js/TypeScript API + a React admin dashboard for managing rooms, players, bans and live chat.

---

## Features

- **Room orchestration** – spawn and manage `azahar-room` instances via config
- **Lobby system** – emulator-integrated room discovery with real-time player counts
- **Chat relay** – messages from the emulator process appear in the admin dashboard live
- **JWT auth** – internal and external JWT endpoints for emulator + dashboard login
- **Admin dashboard** – room configs, player list, ban management, chat monitor, lobby history
- **Ban system** – manual + automatic bans (player reports threshold), with cron sync
- **Stats** – rooms, players, uptime, CPU/memory/RAM
- **WebSocket** – live notifications for new rooms, reports, messages

---

## Tech stack

| Layer | Tech |
|---|---|
| API | Node.js, Express, TypeScript, MySQL2 |
| Dashboard | React, Vite |
| Real-time | WebSocket (`ws`) |
| Process mgmt | PM2 |

---

## Quick start (development)

```bash
# 1. Clone
git clone https://github.com/TheRinzler65/azahar-room-server.git
cd azahar-room-server

# 2. Install
cd master-server/api && npm install
cd ../dashboard && npm install

# 3. Setup env
cp api/.env.local.example api/.env.local
# Edit api/.env.local with your local MySQL credentials

# 4. Create the database (tables are auto-created by the API on startup)
mysql -u root -e "CREATE DATABASE IF NOT EXISTS azahar_master CHARACTER SET utf8mb4"

# 5. Run
cd master-server/api && npm run dev
cd master-server/dashboard && npm run dev
```

Dashboard → http://localhost:5173  
API → http://localhost:3000

## Initial Setup (Bootstrap)

If you plan to use the Admin Dashboard to host dedicated rooms (server-side managed rooms):

1. **Initial Boot**: Start the API with `ROOM_TOKEN=` empty in your `.env`. The database tables will be created automatically.
2. **Register Admin**: Create your admin account via the dashboard.
3. **Get Token**: Retrieve your `citra_token` from the dashboard Profile page or via SQL:
   `SELECT citra_token FROM users WHERE username = 'YourUsername';`
4. **Update Config**: Add your `ROOM_USERNAME` and the copied `ROOM_TOKEN` to your `.env.production` (or `.env.local`).
5. **Restart**: Reload the API (or restart PM2) to apply the settings.
6. **Room Config**: You can now create "Room Configs" in the Admin panel that will successfully spawn managed emulator instances.

*Note: Pure lobby rooms created by players directly from their emulator do not require this server-side setup.*

---

## Production deploy

```bash
# 1. Compile
cd master-server/api && npm run build
cd ../dashboard && npm run build

# 2. Upload dist folder on your server

# 3. On server (example)
cd /opt/azahar/master-server/api
cp api/.env.production.example api/.env.production
# Edit .env.production with real values

# 4. Start with PM2
pm2 start ecosystem.config.js
pm2 save
```

> Do **not** commit `.env.production`, `.env.local` or `*.pem` — they are in `.gitignore`.

---

## Project structure

```
master-server/
├── api/
│   ├── src/                  # Code source backend
│   │   ├── db/               # MySQL models
│   │   ├── middleware/       # Auth + admin check
│   │   ├── routes/           # API routes
│   │   ├── utils/            # Helpers
│   │   ├── env.ts            # Env loader (production vs local)
│   │   ├── index.ts          # Entry point
│   │   ├── roomManager.ts    # Room process spawner + chat relay
│   │   ├── state.ts          # Server state
│   │   └── ws.ts             # WebSocket server
│   ├── .env.production.example
│   ├── .env.local.example
│   ├── ecosystem.config.js   # PM2 config
│   ├── package.json
│   └── tsconfig.json
└── dashboard/
    ├── src/
    │   ├── pages/            # Home, Dashboard, Admin*
    │   ├── components/       # Shared UI components
    │   ├── hooks/            # useAuth, useNotifications
    │   └── utils/            # auth, gameId
    ├── dist/                 # Built frontend (après build)
    └── package.json
```

---

## Environment files

| File | When | Purpose |
|---|---|---|
| `.env.local` | `NODE_ENV !== production` | Local dev (Laragon, MySQL local) |
| `.env.production` | `NODE_ENV = production` | Production server |
| `.env.*.example` | Never loaded | Template — copy and fill |

`loadEnv()` in `src/env.ts` picks the right file automatically based on `NODE_ENV`.

---

## License

MIT
# Tow Truck Platform — Admin Backend & Telegram Bot

This repository provides a production‑ready Node.js backend for the Tow Truck Platform Admin Panel plus a Telegram bot for user interaction. It exposes REST APIs for admin operations, real‑time updates via Socket.IO, and runs a Telegraf bot (long‑polling, no webhook/Ngrok required).

## Features
- Admin authentication with JWT access/refresh tokens and RBAC (SUPER_ADMIN, MANAGER)
- CRUD for Users, Drivers, Orders, Payments, Reviews, Settings
- Analytics summary endpoint for dashboards
- Real‑time events (orders/notifications) via Socket.IO
- Telegram bot with basic commands (/start, /help, /users)
- Secure defaults: helmet, CORS, rate limiting, bcrypt
- Deployable via PM2 or Docker + Nginx

---

## Quick Start

### 1) Create a Telegram Bot
1. In Telegram, search for `@BotFather`.
2. Send `/newbot`, follow the prompts, and copy your bot token, e.g. `123456:ABC-DEF...`.
3. Optionally set the bot name, description, and commands via BotFather.

> This backend uses long‑polling (`bot.launch()`), so you do not need a webhook URL or Ngrok. It works behind Nginx too.

### 2) Configure Environment
Copy `.env` and fill in values:

```
BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=
DB_NAME=tow_truck
JWT_ACCESS_SECRET=dev_access_secret
JWT_REFRESH_SECRET=dev_refresh_secret
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=changeme
```

On the first run, a SUPER_ADMIN is seeded from `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD`.

### 3) Install & Run (Development)
- Install: `npm install`
- Typecheck/build: `npm run build`
- Start dev (ts-node + nodemon): `npm run dev`

Backend is available at `http://localhost:3000`. Swagger stub at `http://localhost:3000/docs`.

PostgreSQL must be reachable with the credentials in `.env`.

### 4) Run with Docker (optional)
```
docker-compose up --build
```
- Backend: `http://localhost:3000`
- Postgres exposed on `5432` (user/password/db from compose or env)

### 5) Production with PM2 (optional)
```
npm run build
pm2 start ecosystem.config.js
```
Use Nginx as reverse proxy (see `nginx.conf.sample`) and add SSL via Certbot.

---

## Using the Telegram Bot (End Users)
The bot is designed to onboard users and can be extended for order flows.

- Start: send `/start` to your bot to register/update your profile. The backend stores your Telegram ID (bigint‑safe).
- Help: `/help` for a brief guide.
- Users count: `/users` replies with total registered users (demo/admin‑oriented sample command).

To find your bot:
- Open Telegram, search for the bot name you set with BotFather.
- Tap “Start” to begin.

> Note: The sample commands are minimal placeholders. You can add order creation, status checks, location sharing, etc., by extending `src/services/botService.ts`.

---

## Admin API (Examples)
Authenticate as admin (seeded credentials):

```
POST /auth/login
Content-Type: application/json
{
  "email": "admin@example.com",
  "password": "changeme"
}
```
Response:
```
{
  "accessToken": "...",
  "refreshToken": "...",
  "admin": { "id": 1, "email": "admin@example.com", "role": "SUPER_ADMIN", "name": "Super Admin" }
}
```

Use the access token in subsequent requests:
```
GET /analytics/summary
Authorization: Bearer <ACCESS_TOKEN>
```

Other key routes (all require auth unless noted):
- `GET /orders`, `GET /orders/:id`, `PATCH /orders/:id` (assign/cancel/update status)
- `GET /drivers`, `POST /drivers`, `PATCH /drivers/:id`, `DELETE /drivers/:id`, `POST /drivers/:id/approve|reject`
- `GET /users`, `POST /users/:id/suspend`, `POST /users/:id/unsuspend`
- `GET /payments`, `GET /payments/export` (CSV)
- `GET /reviews`, `POST /reviews/:id/moderate` (approve/hide/delete)
- `GET /settings` (SUPER_ADMIN), `PATCH /settings` key/value upsert
- `POST /notifications/broadcast` → emits real‑time `notification` event

Swagger UI lives at `/docs` (you can annotate controllers/routes to enrich it).

---

## Real‑Time Events (Socket.IO)
Client can connect to `ws://<host>:<port>` using Socket.IO client.

Emitted events:
- `order.updated` → `{ id, status, driverId }`
- `notification` → `{ audience, title, message, at }`

You can namespace and authenticate sockets later as needed.

---

## Project Structure
- `src/index.ts` — app entry, middleware, routes, Socket.IO init
- `src/config/database.ts` — TypeORM DataSource
- `src/entities/*` — TypeORM entities
- `src/services/*` — business logic (admin, users, bot)
- `src/controllers/*` — route handlers
- `src/routes/*` — routers
- `src/middlewares/auth.ts` — JWT guard + role guard
- `src/utils/*` — jwt, logger, socket

---

## Extending the Bot
Edit `src/services/botService.ts` to add new commands/flows, e.g.:
- `/order` to create a tow request (ask for pickup/dropoff via Telegram replies/location)
- `/status` to show last order status
- `/cancel` to cancel an active order
- Notify users with order updates by pushing messages based on platform events

Best practices:
- Validate user inputs and throttle commands
- Use sessions/wizards (telegraf/scenes) for multi‑step flows
- Respect Telegram rate limits

---

## Troubleshooting
- Postgres connection errors: verify `DB_*` envs and that the database is reachable
- Telegram bot not responding: check `BOT_TOKEN`, ensure internet access, and that the process is running
- `telegramId` overflow: handled via bigint column; if migrating from old schema, run:
  ```sql
  ALTER TABLE "user" ALTER COLUMN "telegramId" TYPE BIGINT USING "telegramId"::bigint;
  ```
- 401/403 on APIs: ensure you `POST /auth/login` and set `Authorization: Bearer <token>`

---

## License
Internal project. Do not redistribute without permission.


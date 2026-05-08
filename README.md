# Quick Split

Quick Split is a mobile-first restaurant bill splitter for one-time meals. It creates temporary sessions, adds participants and bill items, then splits veg, non-veg, drink, and shared items by participant preference.

## Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Database: SQLite
- ORM: Drizzle ORM

## Setup on Termux

Install basic build dependencies first:

```sh
pkg update
pkg install nodejs python make clang
```

Install npm packages:

```sh
npm install
```

Seed demo data:

```sh
npm run seed
```

Run both apps:

```sh
npm run dev
```

Open the frontend at:

```text
http://localhost:5173
```

The API runs at:

```text
http://localhost:4000/api
```

On another device in the same network, use the phone IP with port `5173`.

## Scripts

- `npm run dev` starts the Express API and Vite frontend together.
- `npm run seed` creates the SQLite database and demo dinner data.
- `npm run build` builds the frontend.
- `npm run start` starts only the API server.

## API Routes

- `GET /api/health`
- `GET /api/sessions`
- `POST /api/sessions`
- `GET /api/sessions/:sessionId`
- `POST /api/sessions/:sessionId/participants`
- `DELETE /api/sessions/:sessionId/participants/:participantId`
- `POST /api/sessions/:sessionId/items`
- `DELETE /api/sessions/:sessionId/items/:itemId`
- `PUT /api/sessions/:sessionId/charges`
- `GET /api/sessions/:sessionId/summary`

## Splitting Rules

- Veg items split only among veg eaters.
- Non-veg items split only among non-veg eaters.
- Drink items split only among drinkers.
- Shared items split among everyone.
- Tax, service charge, and tip are distributed proportionally by each participant's allocated item subtotal.
- If an item has no eligible participants, it is reported as unassigned instead of being silently charged to everyone.

## Project Structure

```text
client/
  src/
    components/
    lib/
    App.jsx
server/
  src/
    db/
    routes/
    services/
    validation.js
    server.js
    seed.js
```

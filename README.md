# Quick Split

Quick Split is a mobile-first restaurant bill splitter for one-time meals. It creates temporary sessions, tracks participants and bill items, imports reviewed receipt rows from client-side OCR, and splits veg, non-veg, drink, dessert, alcohol, and shared items by participant preference.

The app is intentionally local-first for the MVP. OCR runs in the browser with Tesseract.js, menu classification runs through the local API, and bill data is stored in SQLite.

## Features

- Temporary bill sessions for one-time meals.
- Participant creation, editing, deletion, and category preferences.
- Manual bill item creation, editing, and deletion.
- Receipt scanning from camera or gallery with browser-side OCR.
- Review screen for correcting OCR item names, prices, categories, and import choices.
- Local menu classification with seeded default menu items and user-corrected mappings.
- Item categories: veg, non-veg, drink, dessert, alcohol, and shared.
- Proportional splitting of tax, service charge, and tip.
- Participant-wise final summary with unassigned amounts called out.

## Stack

- Frontend: React, Vite, Tailwind CSS, Tesseract.js
- Backend: Node.js, Express
- Database: SQLite through sql.js
- ORM: Drizzle ORM

## Quick Start

Install dependencies:

```sh
npm install
```

Seed demo data:

```sh
npm run seed
```

Start the API and frontend together:

```sh
npm run dev
```

Open:

```text
http://localhost:5173
```

The API runs at:

```text
http://localhost:4000/api
```

On another device in the same network, use the host device IP with port `5173`.

## Termux Setup

Install basic build dependencies first:

```sh
pkg update
pkg install nodejs python make clang
```

Then run the normal setup:

```sh
npm install
npm run seed
npm run dev
```

## Scripts

- `npm run dev` starts the Express API and Vite frontend together.
- `npm run seed` creates or refreshes demo SQLite data.
- `npm run build` builds the frontend for production.
- `npm test` runs unit and integration tests with Node's built-in test runner.
- `npm run start` starts only the API server.
- `npm run build --workspace client` builds only the frontend.
- `npm run dev --workspace server` starts only the API in watch mode.

## Configuration

By default, the local SQLite database is written under `server/data/`. Override the database location with:

```sh
QUICK_SPLIT_DB_PATH=/path/to/quicksplit.sqlite npm run start
```

Tests set `QUICK_SPLIT_DB_PATH` to isolated temporary files and should not write to the local development database.

## Validation

Run the full test suite:

```sh
npm test
```

Build the frontend bundle:

```sh
npm run build --workspace client
```

## App Workflow

1. Create or open a bill session.
2. Add participants and choose what each person can share.
3. Add bill items manually, or scan a receipt from camera/gallery.
4. Review OCR rows before import, correcting names, prices, categories, or skipped rows.
5. Add tax, service charge, and tip.
6. Review the participant-wise split summary.

## OCR and Menu Classification

The Bill Items screen includes a receipt scanner. Receipt images are preprocessed in the browser, parsed into review rows, classified by the local API, and imported only after user review.

The API seeds a local `menu_items` table on startup with common dishes, drinks, desserts, and alcohol entries. Corrected category mappings are stored in `custom_menu_mappings`, so future OCR imports can reuse local corrections. Recent OCR review history is kept in browser local storage.

No paid OCR service, hosted AI service, authentication, or cloud sync is required for the MVP.

## Splitting Rules

- Veg items split only among veg eaters.
- Non-veg items split only among non-veg eaters.
- Drink items split only among drinkers.
- Dessert items split only among dessert eaters.
- Alcohol items split only among alcohol-enabled participants.
- Shared items split among everyone.
- Tax, service charge, and tip are distributed proportionally by each participant's allocated item subtotal.
- If an item or extra charge has no eligible participants, the amount is reported as unassigned.

## API Routes

- `GET /api/health`
- `GET /api/sessions`
- `POST /api/sessions`
- `GET /api/sessions/:sessionId`
- `POST /api/sessions/:sessionId/participants`
- `PUT /api/sessions/:sessionId/participants/:participantId`
- `DELETE /api/sessions/:sessionId/participants/:participantId`
- `POST /api/sessions/:sessionId/items`
- `PUT /api/sessions/:sessionId/items/:itemId`
- `DELETE /api/sessions/:sessionId/items/:itemId`
- `PUT /api/sessions/:sessionId/charges`
- `GET /api/sessions/:sessionId/summary`
- `GET /api/menu-mappings`
- `POST /api/menu-mappings/classify`
- `PUT /api/menu-mappings/:itemName`

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
    app.js
    validation.js
    server.js
    seed.js
```

Generated SQLite data under `server/data/` or local `data/` directories should not be committed.

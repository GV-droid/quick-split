# Repository Guidelines

## Project Structure & Module Organization

Quick Split is a two-package npm workspace.

- `client/` contains the React + Vite frontend.
- `client/public/` contains PWA assets copied directly by Vite, including the web app manifest, service worker, and install icon.
- `client/src/components/` contains reusable UI components such as `ParticipantCard`, `ItemCard`, `SplitSummaryCard`, and `OcrReviewPanel`.
- `client/src/lib/` contains frontend helpers, including API calls, category metadata, and OCR parsing utilities.
- `server/` contains the Express API.
- `server/src/db/` contains Drizzle schema and SQLite setup.
- `server/src/routes/` contains API route modules, including session routes and menu mapping/classification routes.
- `server/src/services/` contains business logic, including bill splitting, menu classification, and default menu seeding.
- `server/src/app.js` creates the Express app without binding a port so integration tests can import it. When `client/dist` exists, it also serves the built Vite PWA for production hosting.
- `server/src/seed.js` creates demo data.
- `server/data/` is generated locally for the SQLite database and should not be treated as source code.
- `railway.json` pins Railway production deployment to the root build/start commands and `/api/health` healthcheck.
- `.gitignore` excludes generated dependencies, frontend builds, logs, env files, and local SQLite data.

Tests live near the relevant modules with `.test.js` filenames.

## Build, Test, and Development Commands

- `npm install` installs workspace dependencies.
- `npm run dev` starts both the Express API and Vite frontend.
- `npm run seed` creates or refreshes demo SQLite data.
- `npm run build` builds the frontend for production.
- `npm test` runs all unit and integration tests with Node's built-in test runner.
- `npm run start` starts the backend API and, after `npm run build`, serves the built frontend from `client/dist`. Use this for production hosting.
- `npm run build --workspace client` builds just the frontend.
- `npm run dev --workspace server` starts just the API in watch mode.

Use `npm test` before claiming test coverage. Use `npm run build --workspace client` for frontend bundle verification.

## Architecture Notes

The app is a one-time restaurant bill splitter, not a long-term expense tracker. Participants and bill items can be created, edited, and deleted. Supported edit routes are:

- `PUT /api/sessions/:sessionId/participants/:participantId`
- `PUT /api/sessions/:sessionId/items/:itemId`

Extras (`tax`, `serviceCharge`, and `tip`) are distributed proportionally by each participant's allocated item subtotal. If no eligible participant can receive an item or extra charge, the amount is reported as unassigned.

Supported item categories are `veg`, `nonveg`, `drink`, `dessert`, `alcohol`, and `shared`. Menu classification can also return `unknown`, but persisted bill items should use an assignable category.

OCR is client-side through Tesseract.js. Receipt images from camera or gallery are preprocessed in `client/src/lib/ocr.js`, parsed into review rows, classified through the local API, and imported only after user review. Preserve manual item creation and editing when changing OCR behavior.

The frontend is installable as a PWA. Keep `client/public/manifest.webmanifest`, `client/public/service-worker.js`, and the registration hook in `client/src/registerServiceWorker.js` aligned when changing app shell caching or install metadata. The service worker should not cache API responses because session data is backed by the local Express API and SQLite database.

For single-service Railway deployment, build from the repository root with `npm run build`, start with `npm run start`, mount a volume at `/data`, and set `QUICK_SPLIT_DB_PATH=/data/quicksplit.sqlite`. Keep Railway on the production start path; do not run `npm run dev` or Vite dev server in production. `railway.json` should remain aligned with these commands and should healthcheck `/api/health`.

The local menu classification engine uses SQLite tables:

- `menu_items` stores seeded default menu items and aliases.
- `custom_menu_mappings` stores user-corrected category mappings.

Default menu items are seeded on API startup through `seedDefaultMenuItems()`. Keep classification local; do not introduce paid OCR, hosted AI, cloud sync, or authentication unless explicitly requested.

Participant preferences include veg, non-veg, drinks, dessert, and alcohol. New participant or split logic must remain backward compatible with existing SQLite data.

The database path can be overridden with `QUICK_SPLIT_DB_PATH`. Tests use this to create isolated temporary SQLite files and must not write to `server/data/quicksplit.sqlite`.

## MVP Scope

MVP 1 is the current implemented product. It supports temporary sessions, participant creation and editing, participant food/drink/dessert/alcohol preferences, manual bill item creation and editing, OCR receipt import with review, local menu classification, item categories (`veg`, `nonveg`, `drink`, `dessert`, `alcohol`, `shared`), proportional extras splitting, SQLite persistence, seed/demo data, and a participant-wise final summary.

Future OCR improvements should be incremental. Users must continue to have edit options to correct OCR mistakes, item/category detection errors, participant suggestions, and amounts before the split is finalized.

## Coding Style & Naming Conventions

Use modern JavaScript ES modules throughout. Keep indentation at two spaces. React components use PascalCase filenames and exports, for example `ExpenseBreakdownTable.jsx`. Utility modules use lower camel case or short descriptive names, for example `api.js` and `splitter.js`.

Prefer small, focused functions. Keep validation in `server/src/validation.js`, database schema in `server/src/db/schema.js`, split math in `server/src/services/splitter.js`, OCR parsing in `client/src/lib/ocr.js`, and menu matching in `server/src/services/menuClassifier.js`.

Tailwind classes are used directly in JSX. Keep UI styling mobile-first and avoid introducing a second styling system.

## Testing Guidelines

The test runner is Node's built-in `node:test`, invoked through `npm test`. Add tests near the relevant module:

- `server/src/services/splitter.test.js`
- `server/src/services/menuClassifier.test.js`
- `client/src/lib/ocr.test.js`
- `server/src/routes/api.integration.test.js`
- `client/src/components/ComponentName.test.jsx` when component tests are introduced

Cover edge cases such as no eligible participants, zero extras, proportional tax distribution, empty sessions, low-confidence menu matches, OCR spacing mistakes, and custom category corrections.

For API integration tests, import `createApp()` from `server/src/app.js`, listen on port `0`, and close the server after each test. Set `QUICK_SPLIT_DB_PATH` before importing database modules so each integration test uses an isolated database.

## Commit & Pull Request Guidelines

Use clear imperative commit messages, for example `Add split summary API` or `Fix drink category allocation`. The initial app commit is `64304bd Initial Quick Split app`.

Pull requests should include:

- A concise description of the change.
- Manual verification steps, including commands run.
- Screenshots for frontend UI changes.
- Notes for database or API behavior changes.

The GitHub remote is `origin` at `https://github.com/GV-droid/quick-split.git`. The repository is private and the default branch is `main`.

## Codex Session Handoff

Before ending a Codex session, update `AGENTS.md` if the session changed project structure, architecture, commands, tests, workflow rules, dependencies, or important implementation conventions. Keep the update concise and factual so the next Codex run starts with accurate repository guidance.

## Security & Configuration Tips

Do not add authentication or cloud sync for the MVP unless explicitly requested. Keep the SQLite database local. Avoid committing generated files such as `node_modules/`, `client/dist/`, and `server/data/quicksplit.sqlite`.

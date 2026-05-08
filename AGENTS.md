# Repository Guidelines

## Project Structure & Module Organization

Quick Split is a two-package npm workspace.

- `client/` contains the React + Vite frontend.
- `client/src/components/` contains reusable UI components such as `ParticipantCard`, `ItemCard`, and `SplitSummaryCard`.
- `client/src/lib/` contains frontend helpers, including API calls.
- `server/` contains the Express API.
- `server/src/db/` contains Drizzle schema and SQLite setup.
- `server/src/routes/` contains API route modules.
- `server/src/services/` contains business logic, including bill splitting.
- `server/src/seed.js` creates demo data.
- `server/data/` is generated locally for the SQLite database and should not be treated as source code.
- `.gitignore` excludes generated dependencies, frontend builds, logs, env files, and local SQLite data.

No automated test directory exists yet. Add tests near the relevant module or under a clear `tests/` directory when introduced.

## Build, Test, and Development Commands

- `npm install` installs workspace dependencies.
- `npm run dev` starts both the Express API and Vite frontend.
- `npm run seed` creates or refreshes demo SQLite data.
- `npm run build` builds the frontend for production.
- `npm run start` starts only the backend API.
- `npm run build --workspace client` builds just the frontend.
- `npm run dev --workspace server` starts just the API in watch mode.

There is currently no `npm test` script. Do not claim test coverage until a test runner is added.

## Architecture Notes

The app is a one-time restaurant bill splitter, not a long-term expense tracker. Participants and bill items can be created, edited, and deleted. Supported edit routes are:

- `PUT /api/sessions/:sessionId/participants/:participantId`
- `PUT /api/sessions/:sessionId/items/:itemId`

Extras (`tax`, `serviceCharge`, and `tip`) are distributed proportionally by each participant's allocated item subtotal. If no eligible participant can receive an item or extra charge, the amount is reported as unassigned.

## Coding Style & Naming Conventions

Use modern JavaScript ES modules throughout. Keep indentation at two spaces. React components use PascalCase filenames and exports, for example `ExpenseBreakdownTable.jsx`. Utility modules use lower camel case or short descriptive names, for example `api.js` and `splitter.js`.

Prefer small, focused functions. Keep validation in `server/src/validation.js`, database schema in `server/src/db/schema.js`, and split math in `server/src/services/splitter.js`.

Tailwind classes are used directly in JSX. Keep UI styling mobile-first and avoid introducing a second styling system.

## Testing Guidelines

When adding tests, prioritize the split calculation service first because it carries the main business rules. Recommended names:

- `server/src/services/splitter.test.js`
- `client/src/components/ComponentName.test.jsx`

Cover edge cases such as no eligible participants, zero extras, proportional tax distribution, and empty sessions.

## Commit & Pull Request Guidelines

Use clear imperative commit messages, for example `Add split summary API` or `Fix drink category allocation`. The initial app commit is `64304bd Initial Quick Split app`.

Pull requests should include:

- A concise description of the change.
- Manual verification steps, including commands run.
- Screenshots for frontend UI changes.
- Notes for database or API behavior changes.

The GitHub remote is `origin` at `https://github.com/GV-droid/quick-split.git`. The repository is private and the default branch is `main`.

## Security & Configuration Tips

Do not add authentication or cloud sync for the MVP unless explicitly requested. Keep the SQLite database local. Avoid committing generated files such as `node_modules/`, `client/dist/`, and `server/data/quicksplit.sqlite`.

# Repository Guidance

## Project Layout

- `docs/` contains the complete static web application published through GitHub Pages. Treat this directory as both the source and deployable output for the web app.
- `docs/index.html` is the browser entry point, and `docs/index.tsx` is the React application entry point.
- The Node.js scripts in `scripts/` and the database definitions in `src/` and `supabase/` support the dataset and database. They are separate from the static GitHub Pages deployment.

## Web App Development

- Keep the web app simple to deploy: do not introduce a bundler, build output, or a required npm build step for changes under `docs/`.
- `docs/index.html` uses a Babel service worker to transpile `docs/index.tsx` with the React and TypeScript presets.
- Keep browser code compatible with direct Babel Standalone execution: do not add npm-only imports, bundler syntax, or a required build step for the `docs/` app.

## Local Verification

- Run `npm start` to serve the GitHub Pages app locally from `docs/` on port 8000.
- Run `npm test` for the Node.js test suite and `npm run typecheck` for the project type check when changes affect the data or database code.
# VeteransConnect Frontend

This is the Next.js 16 frontend for VeteransConnect. It provides the public landing page, authentication screens, protected dashboard pages, resource search, and saved-resource workflows.

## Local Development

Install dependencies from the repository root:

```bash
bun install --cwd frontend
```

Create a local environment file:

```bash
cp frontend/.env.local.example frontend/.env.local
```

Start the development server:

```bash
bun run --cwd frontend dev
```

The app runs at `http://localhost:3000` and expects the backend API at `NEXT_PUBLIC_API_BASE_URL`, which defaults to `http://localhost:8080`.

## Checks

```bash
bun run --cwd frontend lint:check
bun run --cwd frontend format:check
bun run --cwd frontend type-check
bun run --cwd frontend test:run
bun run --cwd frontend build
```

## Structure

- `app/` contains App Router pages and layouts.
- `components/` contains reusable UI, auth, layout, and resource components.
- `context/` contains the auth provider.
- `lib/` contains API helpers, auth storage helpers, and shared TypeScript types.
- `test/` contains Vitest setup and framework mocks.

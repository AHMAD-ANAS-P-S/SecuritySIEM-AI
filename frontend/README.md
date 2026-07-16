# SentinelAI — Frontend Architecture

Production-grade React 19 + Vite scaffold. This repository intentionally
ships **without** page or component implementations — it is the
architectural skeleton (routing, contexts, services, aliases, tooling)
that feature teams build on top of.

## Stack

- **React 19** + **Vite 6**
- **Tailwind CSS 3** (JIT, dark-mode via `class`)
- **React Router 7** (data router, lazy-loaded routes)
- **Axios** (single instance, interceptors, token refresh)
- **Framer Motion**, **Lucide React**, **Plotly.js**, **React Hot Toast**

## Getting Started

```bash
npm install
cp .env.example .env
npm run dev
```

## Folder Structure

```
src/
├── assets/       Static assets (images, fonts, svgs)
├── components/   Reusable, presentation-focused UI building blocks
├── layouts/       Route-level shells (AppLayout, AuthLayout, ...)
├── pages/        Route-level screens, one per route
├── hooks/        Reusable hooks (useAuth, useTheme, useFetch, ...)
├── context/      React context providers (Auth, Theme, UI)
├── services/     Axios instance + one module per API domain
├── routes/       Router config, route guards, path constants
├── utils/        Framework-agnostic helpers, constants, storage
└── styles/       Global Tailwind entrypoint
```

## Path Aliases

Configured in both `vite.config.js` (runtime) and `jsconfig.json`
(editor intellisense):

| Alias | Path |
|---|---|
| `@` | `src/` |
| `@assets` | `src/assets` |
| `@components` | `src/components` |
| `@layouts` | `src/layouts` |
| `@pages` | `src/pages` |
| `@hooks` | `src/hooks` |
| `@context` | `src/context` |
| `@services` | `src/services` |
| `@routes` | `src/routes` |
| `@utils` | `src/utils` |
| `@styles` | `src/styles` |

## Routing

`src/routes/index.jsx` defines a `createBrowserRouter` tree with two
top-level branches:

- **Public branch** (`AuthLayout` → `PublicOnlyRoute`): `/login`,
  `/register`, `/forgot-password`. Already-authenticated users are
  redirected to `/dashboard`.
- **Protected branch** (`AppLayout` → `ProtectedRoute`): `/dashboard`,
  `/alerts`, `/alerts/:alertId`, `/settings`, `/profile`. Unauthenticated
  users are redirected to `/login` with the attempted location preserved.

All pages/layouts are `React.lazy`-imported from their reserved path —
add the actual component file at that path and it wires in automatically.
Path strings live in `src/routes/paths.js`, never hardcoded elsewhere.

## Contexts

Three providers, composed once via `<AppProviders>` in `src/context/index.jsx`:

- **AuthContext** — user, `isAuthenticated`, `login`, `logout`, `register`.
  Listens for a global `auth:logout` event dispatched by the axios
  interceptor when silent token refresh fails.
- **ThemeContext** — light/dark theme, persisted to `localStorage`,
  synced to the `dark` class on `<html>` for Tailwind's `darkMode: 'class'`.
- **UIContext** — cross-cutting UI state (sidebar collapse, global loading).

Each has a matching hook in `src/hooks/` (`useAuth`, `useTheme`, `useUI`)
that throws if used outside its provider.

## Services / API Layer

`src/services/apiClient.js` is the single Axios instance for the app:

- Injects the bearer token from storage on every request.
- On `401`, attempts one silent refresh via `/auth/refresh`, queues
  concurrent requests during the refresh, and retries them once the
  new token lands. If refresh fails, clears tokens and dispatches
  `auth:logout` for `AuthContext` to react to.
- Surfaces network/5xx/403/404/429 errors as toasts globally, so
  individual services don't need repetitive error handling.

Domain services (`authService`, `dashboardService`, `alertsService`)
wrap `apiClient` + `ENDPOINTS` and are the only modules that should
import `apiClient` directly — pages/components call services, never
axios.

## Environment Variables

See `.env.example`. All access is funneled through `src/utils/constants.js`
(`ENV`, `STORAGE_KEYS`) — never call `import.meta.env` elsewhere.

## Conventions

- Feature code (pages/components) imports from `@services`, `@hooks`,
  `@context`, `@routes/paths` — never reaches into another feature's
  internals.
- Every new API domain gets its own `src/services/<domain>Service.js`
  plus entries in `src/services/endpoints.js`.
- Every new route gets a path constant in `src/routes/paths.js` and an
  entry in `src/routes/index.jsx`.

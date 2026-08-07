# Repository Guidelines

## Project Structure & Module Organization

This repository contains a split Django/React clinical application under `src/`. The Django REST backend lives in `src/backend`: project configuration is in `config/`, while domain apps (`users`, `patients`, `clinics`, and `appointments`) are grouped under `apps/`. Keep models, serializers, views, URLs, migrations, and tests inside their owning app. The Vite frontend lives in `src/frontend/src`; reusable UI belongs in `components/`, route-level screens in `pages/`, API access in `services/`, shared state in `context/`, helpers in `utils/`, and static files in `assets/`.

## Build, Test, and Development Commands

Run backend commands from `src/backend`:

- `python -m venv venv` and `pip install -r requirements.txt` create the Python environment and install dependencies.
- `python manage.py migrate` applies database migrations.
- `python manage.py runserver` starts the Django API locally.
- `python manage.py test` runs all Django tests.

Run frontend commands from `src/frontend`:

- `npm ci` installs the locked dependency set.
- `npm run dev` starts Vite with hot reload.
- `npm run build` creates a production bundle; `npm run preview` serves it locally.
- `npm run lint` runs Oxlint; `npm test` runs Vitest once.

## Coding Style & Naming Conventions

Use four-space indentation and PEP 8 conventions for Python. Name modules and functions in `snake_case`, classes in `PascalCase`, and Django apps with lowercase plural domain names. Use two-space indentation in JavaScript, `PascalCase` for React components and page files (for example, `LoginPage.jsx`), and `camelCase` for hooks, functions, and service modules. Keep API calls out of components and in `src/frontend/src/services`. Run Oxlint before submitting frontend changes.

## Testing Guidelines

Django tests belong in each app's `tests.py` (or a `tests/` package as suites grow). Frontend tests use Vitest, jsdom, and Testing Library; colocate them as `*.test.jsx`, following `LoginPage.test.jsx`. Test observable behavior, authentication boundaries, validation, and API error states. No coverage threshold is configured, so every behavior change should include focused regression tests.

## Commit & Pull Request Guidelines

History is brief and inconsistent; adopt short, imperative subjects with a conventional prefix, such as `feat: add patient search` or `fix: refresh expired token`. Keep commits scoped to one concern. Pull requests should explain the change and verification performed, link relevant issues, note migrations or configuration changes, and include screenshots for visible UI updates. Never commit virtual environments, `node_modules`, secrets, or local databases.

# HU-18 Appointment Scheduling Implementation Plan

> **For agentic workers:** Implement task-by-task with TDD and verify each subsystem before integration.

**Goal:** Build a permission-aware daily, weekly and monthly appointment agenda that prevents patient and dentist conflicts.

**Architecture:** Django REST owns appointment lifecycle, availability and conflict validation. React consumes those endpoints through a focused service and renders a responsive daily timeline with reusable create/edit and detail panels.

**Tech Stack:** Django 5.2, Django REST Framework, React 19, React Router, Tailwind CSS, Vitest and Testing Library.

## Global Constraints

- Work from `feature/HU-18-citas`, based on `odontograma`.
- Do not add a calendar dependency.
- Keep cancelled and terminal appointments for traceability; expose no DELETE endpoint.
- Restrict durations to 30, 45, 60 or 90 minutes and prevent patient or dentist overlaps.

## Tasks

- [x] Add backend model, migrations, permissions, REST endpoints and availability rules.
- [x] Cover creation, conflicts, filters, permissions and lifecycle transitions with API tests.
- [x] Add the appointment API service and its contract tests.
- [x] Build the accessible daily agenda, responsive timeline and reusable centered modals.
- [x] Add weekly and monthly calendar views backed by inclusive range queries and daily drill-down.
- [x] Cover page states, navigation, permissions, creation, conflicts and transitions.
- [x] Document HU-18 and update the implemented-story summary.
- [x] Run complete backend/frontend verification and browser QA before committing.

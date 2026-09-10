# Odontogram Scroll Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make horizontal odontogram scrolling immediate and natural without changing clinical behavior or page design.

**Architecture:** Keep the browser-owned `overflow-x: auto` scroll surface. Add a ref-only wheel adapter for dominant vertical mouse-wheel input, and coalesce comparison synchronization into one DOM write per animation frame while suppressing the reciprocal programmatic event.

**Tech Stack:** React 19, JavaScript, Tailwind CSS, Vitest, Testing Library, Playwright.

## Global Constraints

- Frontend only; do not modify backend, models, migrations, clinical data, versioning, findings, colors, or page layout.
- Do not store `scrollLeft` in React state or use smooth behavior for continuous input.
- Preserve the native scrollbar, horizontal touchpad input, keyboard focus, tooth interaction, and page scrolling at horizontal edges.
- Do not add comparison synchronization anywhere it does not already exist.

---

### Task 1: Native odontogram scroll surface

**Files:**
- Modify: `src/frontend/src/pages/Patients/OdontogramChart.jsx`
- Test: `src/frontend/src/pages/Patients/OdontogramChart.test.jsx`

**Interfaces:**
- Consumes: the existing `scrollContainerRef`, `onScroll`, and clinical chart props.
- Produces: a focusable region whose dominant vertical wheel delta moves `scrollLeft` directly; native `deltaX` remains browser-owned.

- [x] **Step 1: Write failing behavioral tests**

Cover pixel, line, and page delta modes; native horizontal deltas; release of vertical page scrolling at both horizontal edges; no React rerender from wheel; and tooth selection after scrolling.

- [x] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --reporter=dot src/pages/Patients/OdontogramChart.test.jsx`

Expected: failures because the scroll region and vertical-wheel adapter do not exist.

- [x] **Step 3: Implement the minimal ref-only adapter**

Use a local DOM ref, forward the node to `scrollContainerRef`, normalize `deltaMode` to pixels from computed line height or container width, and call `preventDefault()` only when the container can consume movement in that direction. Do not multiply pixel deltas or use smooth scrolling.

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- --reporter=dot src/pages/Patients/OdontogramChart.test.jsx`

Expected: all focused tests pass without warnings.

### Task 2: Comparison synchronization

**Files:**
- Modify: `src/frontend/src/pages/Patients/PatientOdontogramHistoryPage.jsx`
- Test: `src/frontend/src/pages/Patients/OdontogramPages.test.jsx`

**Interfaces:**
- Consumes: the two existing chart refs and their scroll events.
- Produces: stable A→B and B→A handlers that retain the latest requested offset and perform at most one target write per animation frame.

- [x] **Step 1: Write a failing comparison regression test**

Dispatch multiple source scroll events before one animation frame, assert that the target receives only the latest offset after the frame, assert that its programmatic scroll event does not schedule a reciprocal frame, and verify that both selected version IDs remain unchanged.

- [x] **Step 2: Run the regression and verify RED**

Run: `npm test -- --reporter=dot src/pages/Patients/OdontogramPages.test.jsx`

Expected: the current handler writes synchronously instead of coalescing to the latest frame.

- [x] **Step 3: Implement frame-coalesced ref synchronization**

Store the pending target/offset, frame ID, and last programmatic write in refs. Use stable callbacks, skip equal offsets, cancel a pending frame on unmount, and do not update React state.

- [x] **Step 4: Run odontogram regressions and verify GREEN**

Run: `npm test -- --reporter=dot src/pages/Patients/OdontogramChart.test.jsx src/pages/Patients/OdontogramPages.test.jsx`

Expected: wheel, comparison, version-selection, and tooth-interaction tests pass.

### Task 3: Full verification and manual performance evidence

**Files:**
- Inspect: scoped frontend diff only.

**Interfaces:**
- Consumes: the optimized components and local application.
- Produces: fresh automated and browser evidence for completion.

- [x] **Step 1: Run all frontend quality gates**

Run: `npm test -- --reporter=dot`, `npm run lint`, and `npm run build`.

Expected: zero failures and successful production build.

- [x] **Step 2: Validate in Chromium**

Open the comparison page, dispatch representative mouse-wheel and horizontal-touchpad events, confirm immediate movement, synchronized final offsets, no version changes, no long tasks, retained scrollbar, and continued tooth/button interaction.

- [x] **Step 3: Review scope**

Run: `git diff --check` and inspect the diff for the four scoped implementation/test files plus this plan. Preserve all unrelated pre-existing changes.

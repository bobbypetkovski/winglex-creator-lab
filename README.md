# Winglex Creator Lab

Private internal creator evaluation workspace.

## Features
- Seeded from the supplied Poland tracker; CSV imports match by handle.
- Editable campaign, fit rubric, quotes, cost adjustments and claim economics.
- Conservative/base/optimistic scenarios and named snapshots.
- Aggregate actual-result CSV imports and manual editing.
- D1 workspace persistence with optimistic revision checks.

## Model
All starting financial and conversion inputs are illustrative. A claim is one signed passenger. Forecasts use expected placement views, sequential funnel conversion and expected contribution after successful and unsuccessful case-handling costs. Unknown prices and reach remain unknown. No probabilistic confidence, incremental lift, unique audience reach or automatic AI fit is claimed.

## Storage boundary
The workspace payload is keyed by brand_id, with Winglex as the only enabled brand. Additional brands require authorization and tenant boundaries before being enabled. The Sites deployment is owner-private. State is saved explicitly; no browser storage is authoritative.

## Integrations
CSV only in this release. Live spreadsheet sync, screenshot extraction and platform analytics are not enabled. No API keys are needed for the current functions.

## Validation
Verified model calculations, missing/zero inputs, multiline CSV parsing, source import, outcomes matching and SQLite revision checks. Production bundle built with the Sites build script. Browser interaction testing was not performed.
